import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { writeFile, readFile, unlink, mkdir, rm } from "node:fs/promises";

import { createBackup, getBackupPath } from "../src/config/backup.js";
import { AppError } from "../src/errors/app-error.js";

const testDir = "test-fixtures/backup";
const testConfigPath = join(testDir, "test.ini");

describe("backup", () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(testConfigPath, "key=value\n");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return correct backup path", () => {
    const result = getBackupPath(testConfigPath);
    expect(result).toBe(`${testConfigPath}.bak`);
  });

  it("should create backup file", async () => {
    await createBackup(testConfigPath);

    const backupContent = await readFile(getBackupPath(testConfigPath));
    expect(backupContent.toString()).toBe("key=value\n");
  });

  it("should overwrite existing backup", async () => {
    await writeFile(getBackupPath(testConfigPath), "old content");
    await createBackup(testConfigPath);

    const backupContent = await readFile(getBackupPath(testConfigPath));
    expect(backupContent.toString()).toBe("key=value\n");
  });

  it("should throw IO_ERROR when source file does not exist", async () => {
    const nonExistentPath = join(testDir, "nonexistent.ini");

    await expect(createBackup(nonExistentPath)).rejects.toThrow(AppError);
    await expect(createBackup(nonExistentPath)).rejects.toMatchObject({
      code: "IO_ERROR",
      status: 500,
    });
  });

  it("should preserve binary content in backup", async () => {
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    await writeFile(testConfigPath, binaryContent);

    await createBackup(testConfigPath);

    const backupContent = await readFile(getBackupPath(testConfigPath));
    expect(Buffer.compare(backupContent, binaryContent)).toBe(0);
  });

  it("should preserve empty file in backup", async () => {
    await writeFile(testConfigPath, "");

    await createBackup(testConfigPath);

    const backupContent = await readFile(getBackupPath(testConfigPath));
    expect(backupContent.toString()).toBe("");
  });
});
