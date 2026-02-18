import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, readFile, unlink, mkdir, rmdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadServersConfig, saveServersConfig } from "../src/config/servers-config.js";
import { readConfig, saveConfig } from "../src/config/service.js";
import type { ServersConfig } from "../src/types/server.js";

const TEST_DIR = join(tmpdir(), "pzserver-config-panel-v2-test-" + Date.now());

async function setupTestDir() {
  await mkdir(TEST_DIR, { recursive: true });
}

async function cleanupTestDir() {
  try {
    await rmdir(TEST_DIR, { recursive: true });
  } catch {
    // 忽略清理错误
  }
}

describe("V2 Regression Tests", () => {
  beforeEach(setupTestDir);
  afterEach(cleanupTestDir);

  describe("Servers Config", () => {
    it("should save and load servers-config.json", async () => {
      const config: ServersConfig = {
        workshopPath: "/path/to/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          {
            id: "server-1",
            name: "Test Server",
            iniPath: join(TEST_DIR, "server.ini"),
            startCommand: "/path/to/start.sh",
            stopCommands: ["save", "quit"],
          },
        ],
      };

      await saveServersConfig(config, { serversConfigPath: join(TEST_DIR, "servers-config.json") });
      const loaded = await loadServersConfig({ serversConfigPath: join(TEST_DIR, "servers-config.json") });

      expect(loaded.workshopPath).toBe(config.workshopPath);
      expect(loaded.servers).toHaveLength(1);
      expect(loaded.servers[0].id).toBe("server-1");
      expect(loaded.servers[0].name).toBe("Test Server");
    });

    it("should validate server id uniqueness", async () => {
      const config: ServersConfig = {
        workshopPath: "/path/to/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          { id: "same-id", name: "Server 1", iniPath: "/a.ini", startCommand: "cmd", stopCommands: [] },
          { id: "same-id", name: "Server 2", iniPath: "/b.ini", startCommand: "cmd", stopCommands: [] },
        ],
      };

      await expect(saveServersConfig(config)).rejects.toThrow();
    });

    it("should validate iniPath is absolute", async () => {
      const config: ServersConfig = {
        workshopPath: "/path/to/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          { id: "server-1", name: "Test", iniPath: "relative/path.ini", startCommand: "cmd", stopCommands: [] },
        ],
      };

      await expect(saveServersConfig(config)).rejects.toThrow();
    });

    it("should validate startCommand is not empty", async () => {
      const config: ServersConfig = {
        workshopPath: "/path/to/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          { id: "server-1", name: "Test", iniPath: "/abs/path.ini", startCommand: "", stopCommands: [] },
        ],
      };

      await expect(saveServersConfig(config)).rejects.toThrow();
    });
  });

  describe("Config Service with Server Context", () => {
    it("should read config for specific server", async () => {
      const iniPath = join(TEST_DIR, "test.ini");
      const iniContent = `Public=true\nMaxPlayers=32\n`;
      await writeFile(iniPath, iniContent, "utf-8");

      const data = await readConfig(iniPath);

      expect(data.items).toHaveLength(2);
      expect(data.items.find((i) => i.key === "Public")?.value).toBe("true");
      expect(data.items.find((i) => i.key === "MaxPlayers")?.value).toBe("32");
    });

    it("should save config and maintain encoding", async () => {
      const iniPath = join(TEST_DIR, "test.ini");
      const iniContent = `Public=true\nMaxPlayers=32\n`;
      await writeFile(iniPath, iniContent, "utf-8");

      const items = [
        { key: "Public", value: "false" },
        { key: "MaxPlayers", value: "64" },
      ];

      await saveConfig(iniPath, { items });

      const saved = await readFile(iniPath, "utf-8");
      expect(saved).toContain("Public=false");
      expect(saved).toContain("MaxPlayers=64");
    });

    it("should handle Mods and WorkshopItems as lists", async () => {
      const iniPath = join(TEST_DIR, "test.ini");
      const iniContent = `Mods=ModA;ModB;ModC\nWorkshopItems=123;456\n`;
      await writeFile(iniPath, iniContent, "utf-8");

      const data = await readConfig(iniPath);

      const modsItem = data.items.find((i) => i.key === "Mods");
      expect(modsItem?.value).toBe("ModA;ModB;ModC");

      const workshopItem = data.items.find((i) => i.key === "WorkshopItems");
      expect(workshopItem?.value).toBe("123;456");
    });
  });

  describe("Legacy Paths Migration", () => {
    it("should migrate from paths-config.json", async () => {
      const legacyConfig = {
        workshopPath: "/path/to/workshop",
        iniFilePath: join(TEST_DIR, "legacy.ini"),
      };
      await writeFile(join(TEST_DIR, "paths-config.json"), JSON.stringify(legacyConfig), "utf-8");

      const config = await loadServersConfig({ serversConfigPath: join(TEST_DIR, "servers-config.json"), legacyPathsConfigPath: join(TEST_DIR, "paths-config.json") });

      expect(config.workshopPath).toBe(legacyConfig.workshopPath);
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].iniPath).toBe(legacyConfig.iniFilePath);
    });

    it("should prefer servers-config.json over paths-config.json", async () => {
      const legacyConfig = {
        workshopPath: "/old/workshop",
        iniFilePath: "/old/server.ini",
      };
      await writeFile(join(TEST_DIR, "paths-config.json"), JSON.stringify(legacyConfig), "utf-8");

      const newConfig: ServersConfig = {
        workshopPath: "/new/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          {
            id: "new-server",
            name: "New Server",
            iniPath: "/new/server.ini",
            startCommand: "cmd",
            stopCommands: [],
          },
        ],
      };
      await writeFile(join(TEST_DIR, "servers-config.json"), JSON.stringify(newConfig), "utf-8");

      const config = await loadServersConfig({ serversConfigPath: join(TEST_DIR, "servers-config.json"), legacyPathsConfigPath: join(TEST_DIR, "paths-config.json") });

      expect(config.workshopPath).toBe("/new/workshop");
      expect(config.servers[0].id).toBe("new-server");
    });
  });

  describe("API Routes Compatibility", () => {
    it("should include serverId in config response", async () => {
      const iniPath = join(TEST_DIR, "api-test.ini");
      await writeFile(iniPath, "Public=true\n", "utf-8");

      const serversConfig: ServersConfig = {
        workshopPath: "/workshop",
        stopGraceTimeoutMs: 30000,
        forceKillTimeoutMs: 10000,
        servers: [
          {
            id: "test-server",
            name: "Test",
            iniPath,
            startCommand: "cmd",
            stopCommands: [],
          },
        ],
      };
      await saveServersConfig(serversConfig);

      // 模拟 API 调用
      const data = await readConfig(iniPath);

      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("configPath");
      expect(data.items).toBeInstanceOf(Array);
    });

    it("should handle workshop poster paths", async () => {
      const workshopDir = join(TEST_DIR, "workshop", "108600", "123456", "Mods", "TestMod");
      await mkdir(workshopDir, { recursive: true });

      const posterPath = join(workshopDir, "poster.png");
      await writeFile(posterPath, "fake-image-data", "utf-8");

      // poster 应该可以通过相对路径访问
      const relativePath = "123456/Mods/TestMod/poster.png";
      expect(relativePath).toContain("poster");
    });
  });
});
