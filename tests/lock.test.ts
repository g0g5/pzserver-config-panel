import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { unlink, writeFile, stat, readFile, mkdir, rm, utimes } from "node:fs/promises";

import { acquireLock, getLockPath, withLock } from "../src/config/lock.js";
import { AppError } from "../src/errors/app-error.js";

const testDir = "test-fixtures/lock";
const testConfigPath = join(testDir, "test.ini");

describe("lock", () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  it("should return correct lock path", () => {
    const result = getLockPath(testConfigPath);
    expect(result).toBe(`${testConfigPath}.lock`);
  });

  it("should acquire lock and release it", async () => {
    const release = await acquireLock(testConfigPath);
    await release();

    await expect(unlink(getLockPath(testConfigPath))).rejects.toThrow("ENOENT");
  });

  it("should throw FILE_LOCKED when lock already exists and is fresh", async () => {
    const lockPath = getLockPath(testConfigPath);
    await writeFile(lockPath, "12345");

    try {
      await expect(acquireLock(testConfigPath)).rejects.toThrow(AppError);
      await expect(acquireLock(testConfigPath)).rejects.toMatchObject({
        code: "FILE_LOCKED",
        status: 409,
      });
    } finally {
      await unlink(lockPath).catch(() => {});
    }
  });

  it("should acquire lock if existing lock is stale", async () => {
    const lockPath = getLockPath(testConfigPath);
    await writeFile(lockPath, "12345");

    const staleTime = new Date(Date.now() - 61 * 60 * 1000);
    await utimes(lockPath, staleTime, staleTime);

    const release = await acquireLock(testConfigPath);
    await release();

    await expect(unlink(lockPath)).rejects.toThrow("ENOENT");
  });

  it("should release lock even if function throws", async () => {
    await expect(
      withLock(testConfigPath, async () => {
        throw new Error("Test error");
      })
    ).rejects.toThrow("Test error");

    await expect(unlink(getLockPath(testConfigPath))).rejects.toThrow("ENOENT");
  });

  it("should execute function with lock and release after completion", async () => {
    const testValue = "test-result";

    const result = await withLock(testConfigPath, async () => {
      return testValue;
    });

    expect(result).toBe(testValue);

    await expect(unlink(getLockPath(testConfigPath))).rejects.toThrow("ENOENT");
  });

  it("should handle concurrent lock acquisition", async () => {
    let lockAcquired1 = false;
    let lockAcquired2 = false;

    const promise1 = acquireLock(testConfigPath).then(async (release) => {
      lockAcquired1 = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
      await release();
    });

    const promise2 = acquireLock(testConfigPath).then(async (release) => {
      lockAcquired2 = true;
      await release();
    });

    const results = await Promise.allSettled([promise1, promise2]);

    expect(results.some((r) => r.status === "rejected")).toBe(true);
    expect(lockAcquired1 || lockAcquired2).toBe(true);
  });
});
