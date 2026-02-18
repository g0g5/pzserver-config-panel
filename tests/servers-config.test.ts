import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  applyLegacyPathsConfig,
  loadServersConfig,
  saveServersConfig,
  toLegacyPathsConfig,
} from "../src/config/servers-config.js";
import { AppError } from "../src/errors/app-error.js";
import type { ServersConfig } from "../src/types/server.js";

const testDir = "test-fixtures/servers-config";
const serversConfigPath = join(testDir, "servers-config.json");
const legacyPathsConfigPath = join(testDir, "paths-config.json");

describe("servers-config", () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should migrate from legacy paths-config.json", async () => {
    await writeFile(
      legacyPathsConfigPath,
      JSON.stringify(
        {
          workshopPath: "/home/steam/Steam/steamapps/workshop/content/108600",
          iniFilePath: "/home/steam/Zomboid/Server/servertest.ini",
        },
        null,
        2,
      ),
      "utf8",
    );

    const config = await loadServersConfig({
      serversConfigPath,
      legacyPathsConfigPath,
    });

    expect(config.workshopPath).toBe(
      "/home/steam/Steam/steamapps/workshop/content/108600",
    );
    expect(config.servers).toHaveLength(1);
    expect(config.servers[0]).toMatchObject({
      id: "servertest",
      name: "servertest",
      iniPath: "/home/steam/Zomboid/Server/servertest.ini",
      stopCommands: ["save", "quit"],
    });

    const persisted = JSON.parse(await readFile(serversConfigPath, "utf8")) as ServersConfig;
    expect(persisted.servers).toHaveLength(1);
  });

  it("should initialize from CLI config path when no config exists", async () => {
    const config = await loadServersConfig({
      cliConfigPath: "/srv/pz/server-main.ini",
      serversConfigPath,
      legacyPathsConfigPath,
    });

    expect(config.servers).toHaveLength(1);
    expect(config.servers[0]).toMatchObject({
      id: "server-main",
      iniPath: "/srv/pz/server-main.ini",
      startCommand: "./start-server.sh",
      stopCommands: ["save", "quit"],
    });
  });

  it("should reject duplicate server ids", async () => {
    await expect(
      saveServersConfig(
        {
          workshopPath: "",
          stopGraceTimeoutMs: 45000,
          forceKillTimeoutMs: 10000,
          servers: [
            {
              id: "same",
              name: "A",
              iniPath: "/a/test.ini",
              startCommand: "./start-a.sh",
              stopCommands: ["save", "quit"],
            },
            {
              id: "same",
              name: "B",
              iniPath: "/b/test.ini",
              startCommand: "./start-b.sh",
              stopCommands: ["save", "quit"],
            },
          ],
        },
        { serversConfigPath },
      ),
    ).rejects.toThrow(AppError);

    await expect(
      saveServersConfig(
        {
          workshopPath: "",
          stopGraceTimeoutMs: 45000,
          forceKillTimeoutMs: 10000,
          servers: [
            {
              id: "same",
              name: "A",
              iniPath: "/a/test.ini",
              startCommand: "./start-a.sh",
              stopCommands: ["save", "quit"],
            },
            {
              id: "same",
              name: "B",
              iniPath: "/b/test.ini",
              startCommand: "./start-b.sh",
              stopCommands: ["save", "quit"],
            },
          ],
        },
        { serversConfigPath },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should reject non-absolute iniPath", async () => {
    await expect(
      saveServersConfig(
        {
          workshopPath: "",
          stopGraceTimeoutMs: 45000,
          forceKillTimeoutMs: 10000,
          servers: [
            {
              id: "main",
              name: "Main",
              iniPath: "./relative.ini",
              startCommand: "./start.sh",
              stopCommands: ["save", "quit"],
            },
          ],
        },
        { serversConfigPath },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should reject empty startCommand", async () => {
    await expect(
      saveServersConfig(
        {
          workshopPath: "",
          stopGraceTimeoutMs: 45000,
          forceKillTimeoutMs: 10000,
          servers: [
            {
              id: "main",
              name: "Main",
              iniPath: "/home/steam/Zomboid/Server/main.ini",
              startCommand: "   ",
              stopCommands: ["save", "quit"],
            },
          ],
        },
        { serversConfigPath },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });

  it("should support legacy /paths compatibility mapping", () => {
    const config: ServersConfig = {
      workshopPath: "/workshop",
      stopGraceTimeoutMs: 45000,
      forceKillTimeoutMs: 10000,
      servers: [
        {
          id: "a",
          name: "A",
          iniPath: "/srv/a.ini",
          startCommand: "./start-a.sh",
          stopCommands: ["save", "quit"],
        },
      ],
    };

    const updated = applyLegacyPathsConfig(config, {
      workshopPath: "/new-workshop",
      iniFilePath: "/srv/b.ini",
    });

    expect(updated.workshopPath).toBe("/new-workshop");
    expect(updated.servers[0].iniPath).toBe("/srv/b.ini");
    expect(toLegacyPathsConfig(updated)).toEqual({
      workshopPath: "/new-workshop",
      iniFilePath: "/srv/b.ini",
    });
  });
});
