import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { writeFile, readFile, mkdir, rm, stat } from "node:fs/promises";

import { saveConfig } from "../src/config/service.js";
import { AppError } from "../src/errors/app-error.js";

const testDir = "test-fixtures/service";
const testConfigPath = join(testDir, "test.ini");

function createTestConfig(content: string): Promise<void> {
  return writeFile(testConfigPath, content, "utf-8");
}

describe("saveConfig", () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should save config successfully with valid data", async () => {
    await createTestConfig("AKey=value1\nBKey=value2\n");

    const result = await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "newvalue1" },
        { key: "BKey", value: "newvalue2" },
        { key: "CKey", value: "value3" },
      ],
    });

    expect(result).toEqual({ ok: true });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=newvalue1\nBKey=newvalue2\nCKey=value3");
  });

  it("should throw BAD_REQUEST if request body is not an object", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, null as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, null as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if items is missing", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, {} as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, {} as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if items is not an array", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: "not-an-array" } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: "not-an-array" } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item is not an object", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: ["not-an-object"] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: ["not-an-object"] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item key is missing", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: [{ value: "value1" }] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: [{ value: "value1" }] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item key is empty string", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: [{ key: "", value: "value1" }] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: [{ key: "", value: "value1" }] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item key is not a string", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: [{ key: 123, value: "value1" }] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: [{ key: 123, value: "value1" }] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item value is missing", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: [{ key: "AKey" }] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: [{ key: "AKey" }] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should throw BAD_REQUEST if item value is not a string", async () => {
    await createTestConfig("AKey=value1\n");

    await expect(
      saveConfig(testConfigPath, { items: [{ key: "AKey", value: 123 }] } as any)
    ).rejects.toThrow(AppError);
    await expect(
      saveConfig(testConfigPath, { items: [{ key: "AKey", value: 123 }] } as any)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should normalize Mods field (trim and remove empty items)", async () => {
    await createTestConfig("Mods=mod1;mod2\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "Mods", value: " mod1 ;  ; mod2 " },
        { key: "AKey", value: "value1" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=value1\nMods=mod1;mod2");
  });

  it("should normalize WorkshopItems field (trim and remove empty items)", async () => {
    await createTestConfig("WorkshopItems=item1;item2\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "WorkshopItems", value: "item1; ;item2;" },
        { key: "AKey", value: "value1" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=value1\nWorkshopItems=item1;item2");
  });

  it("should sort keys alphabetically", async () => {
    await createTestConfig("BKey=value2\nAKey=value1\nCKey=value3\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "ZKey", value: "value5" },
        { key: "AKey", value: "value1" },
        { key: "BKey", value: "value2" },
        { key: "CKey", value: "value3" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=value1\nBKey=value2\nCKey=value3\nZKey=value5");
  });

  it("should preserve LF newline style", async () => {
    await createTestConfig("AKey=value1\nBKey=value2\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "newvalue1" },
        { key: "BKey", value: "newvalue2" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=newvalue1\nBKey=newvalue2");
  });

  it("should preserve CRLF newline style", async () => {
    const initialContent = "AKey=value1\r\nBKey=value2\r\n";
    await writeFile(testConfigPath, initialContent, "utf-8");

    await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "newvalue1" },
        { key: "BKey", value: "newvalue2" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=newvalue1\r\nBKey=newvalue2");
  });

  it("should create backup file before saving", async () => {
    await createTestConfig("AKey=value1\nBKey=value2\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "newvalue1" },
        { key: "BKey", value: "newvalue2" },
      ],
    });

    const backupContent = await readFile(`${testConfigPath}.bak`, "utf-8");
    expect(backupContent).toBe("AKey=value1\nBKey=value2\n");
  });

  it("should handle concurrent save requests (second should fail)", async () => {
    await createTestConfig("AKey=value1\n");

    const promise1 = saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "newvalue1" },
        { key: "BKey", value: "value2" },
      ],
    });

    const promise2 = saveConfig(testConfigPath, {
      items: [
        { key: "CKey", value: "value3" },
        { key: "DKey", value: "value4" },
      ],
    });

    const results = await Promise.allSettled([promise1, promise2]);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    if (failCount > 0) {
      const failedResult = results.find((r) => r.status === "rejected");
      expect(failedResult?.reason).toBeInstanceOf(AppError);
      expect((failedResult?.reason as AppError).code).toBe("FILE_LOCKED");
    }
  });

  it("should work when config file does not exist yet", async () => {
    const result = await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "value1" },
        { key: "BKey", value: "value2" },
      ],
    });

    expect(result).toEqual({ ok: true });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=value1\nBKey=value2");

    const stats = await stat(testConfigPath);
    expect(stats.isFile()).toBe(true);
  });

  it("should handle empty items array", async () => {
    await createTestConfig("AKey=value1\nBKey=value2\n");

    await saveConfig(testConfigPath, {
      items: [],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("");
  });

  it("should handle items with special characters in values", async () => {
    await createTestConfig("AKey=value1\n");

    await saveConfig(testConfigPath, {
      items: [
        { key: "AKey", value: "value with spaces" },
        { key: "BKey", value: "value=with=equals" },
      ],
    });

    const content = await readFile(testConfigPath, "utf-8");
    expect(content).toBe("AKey=value with spaces\nBKey=value=with=equals");
  });
});
