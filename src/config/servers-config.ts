import { basename, isAbsolute } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { AppError } from "../errors/app-error.js";
import type { ServerInstance, ServersConfig } from "../types/server.js";

type LegacyPathsConfigFile = {
  workshopPath?: unknown;
  iniFilePath?: unknown;
};

export type LegacyPathsConfig = {
  workshopPath: string;
  iniFilePath: string;
};

type LoadServersConfigOptions = {
  cliConfigPath?: string;
  serversConfigPath?: string;
  legacyPathsConfigPath?: string;
};

type SaveServersConfigOptions = {
  serversConfigPath?: string;
};

const SERVERS_CONFIG_FILE = "./servers-config.json";
const LEGACY_PATHS_CONFIG_FILE = "./paths-config.json";
const DEFAULT_STOP_GRACE_TIMEOUT_MS = 45000;
const DEFAULT_FORCE_KILL_TIMEOUT_MS = 10000;
const DEFAULT_STOP_COMMANDS = ["save", "quit"];
const DEFAULT_START_COMMAND = "./start-server.sh";
const DEFAULT_SERVER_ID = "default";
const DEFAULT_SERVER_NAME = "默认实例";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIniPath(iniPath: string): boolean {
  return isAbsolute(iniPath) && /\.ini$/i.test(iniPath);
}

function ensureValidIniPath(iniPath: string, fieldName: string): void {
  if (!isValidIniPath(iniPath)) {
    throw new AppError(
      "BAD_REQUEST",
      `${fieldName} must be an absolute path ending with .ini`,
    );
  }
}

function normalizeTimeout(
  value: unknown,
  fieldName: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new AppError("BAD_REQUEST", `${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function normalizeStopCommands(value: unknown, index: number): string[] {
  if (value === undefined) {
    return [...DEFAULT_STOP_COMMANDS];
  }

  if (!Array.isArray(value)) {
    throw new AppError(
      "BAD_REQUEST",
      `servers[${index}].stopCommands must be a string array`,
    );
  }

  const normalized = value
    .map((item, itemIndex) => {
      if (typeof item !== "string") {
        throw new AppError(
          "BAD_REQUEST",
          `servers[${index}].stopCommands[${itemIndex}] must be a string`,
        );
      }
      return item.trim();
    })
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    return [...DEFAULT_STOP_COMMANDS];
  }

  return normalized;
}

function normalizeServerInstance(
  value: unknown,
  index: number,
  usedIds: Set<string>,
): ServerInstance {
  if (!isObject(value)) {
    throw new AppError("BAD_REQUEST", `servers[${index}] must be an object`);
  }

  const rawId = typeof value.id === "string" ? value.id.trim() : "";
  if (!rawId) {
    throw new AppError("BAD_REQUEST", `servers[${index}].id must be a non-empty string`);
  }

  if (usedIds.has(rawId)) {
    throw new AppError("BAD_REQUEST", `servers[${index}].id must be unique`);
  }
  usedIds.add(rawId);

  const rawName = typeof value.name === "string" ? value.name.trim() : "";
  const rawIniPath = typeof value.iniPath === "string" ? value.iniPath.trim() : "";
  ensureValidIniPath(rawIniPath, `servers[${index}].iniPath`);

  const rawStartCommand =
    typeof value.startCommand === "string" ? value.startCommand.trim() : "";
  if (!rawStartCommand) {
    throw new AppError(
      "BAD_REQUEST",
      `servers[${index}].startCommand must be a non-empty string`,
    );
  }

  return {
    id: rawId,
    name: rawName || rawId,
    iniPath: rawIniPath,
    startCommand: rawStartCommand,
    stopCommands: normalizeStopCommands(value.stopCommands, index),
  };
}

function normalizeServersConfig(value: unknown): ServersConfig {
  if (!isObject(value)) {
    throw new AppError("BAD_REQUEST", "Servers config must be an object");
  }

  if (
    value.workshopPath !== undefined &&
    typeof value.workshopPath !== "string"
  ) {
    throw new AppError("BAD_REQUEST", "workshopPath must be a string");
  }

  const workshopPath =
    typeof value.workshopPath === "string" ? value.workshopPath : "";

  const stopGraceTimeoutMs = normalizeTimeout(
    value.stopGraceTimeoutMs,
    "stopGraceTimeoutMs",
    DEFAULT_STOP_GRACE_TIMEOUT_MS,
  );
  const forceKillTimeoutMs = normalizeTimeout(
    value.forceKillTimeoutMs,
    "forceKillTimeoutMs",
    DEFAULT_FORCE_KILL_TIMEOUT_MS,
  );

  if (!Array.isArray(value.servers)) {
    throw new AppError("BAD_REQUEST", "servers must be an array");
  }

  const usedIds = new Set<string>();
  const servers = value.servers.map((item, index) =>
    normalizeServerInstance(item, index, usedIds),
  );

  return {
    workshopPath,
    stopGraceTimeoutMs,
    forceKillTimeoutMs,
    servers,
  };
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return DEFAULT_SERVER_ID;
  }

  return normalized;
}

function getIniBaseName(iniPath: string): string {
  const fileName = basename(iniPath).replace(/\.ini$/i, "").trim();
  return fileName || DEFAULT_SERVER_ID;
}

function createUniqueId(baseId: string, usedIds: Set<string>): string {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  const resolved = `${baseId}-${suffix}`;
  usedIds.add(resolved);
  return resolved;
}

function createServerFromIniPath(
  iniPath: string,
  usedIds: Set<string>,
): ServerInstance {
  const baseName = getIniBaseName(iniPath);
  const id = createUniqueId(slugify(baseName), usedIds);

  return {
    id,
    name: baseName || DEFAULT_SERVER_NAME,
    iniPath,
    startCommand: DEFAULT_START_COMMAND,
    stopCommands: [...DEFAULT_STOP_COMMANDS],
  };
}

function normalizeLegacyPathsConfig(value: unknown): LegacyPathsConfig {
  if (!isObject(value)) {
    return {
      workshopPath: "",
      iniFilePath: "",
    };
  }

  const legacy = value as LegacyPathsConfigFile;

  return {
    workshopPath:
      typeof legacy.workshopPath === "string" ? legacy.workshopPath : "",
    iniFilePath:
      typeof legacy.iniFilePath === "string" ? legacy.iniFilePath : "",
  };
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    const maybeErrno = error as NodeJS.ErrnoException;
    if (maybeErrno?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeServersConfigFile(
  config: ServersConfig,
  filePath: string,
): Promise<void> {
  await writeFile(
    filePath,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
}

function createMigratedConfig(
  legacy: LegacyPathsConfig,
  cliConfigPath?: string,
): ServersConfig {
  const servers: ServerInstance[] = [];
  const usedIds = new Set<string>();
  const iniCandidates = [legacy.iniFilePath, cliConfigPath ?? ""];

  for (const candidate of iniCandidates) {
    const normalized = candidate.trim();
    if (!normalized || !isValidIniPath(normalized)) {
      continue;
    }

    servers.push(createServerFromIniPath(normalized, usedIds));
    break;
  }

  return {
    workshopPath: legacy.workshopPath,
    stopGraceTimeoutMs: DEFAULT_STOP_GRACE_TIMEOUT_MS,
    forceKillTimeoutMs: DEFAULT_FORCE_KILL_TIMEOUT_MS,
    servers,
  };
}

export function getServerInstance(
  config: ServersConfig,
  serverId?: string,
): ServerInstance | null {
  if (config.servers.length === 0) {
    return null;
  }

  if (!serverId) {
    return config.servers[0];
  }

  return config.servers.find((server) => server.id === serverId) ?? null;
}

export function toLegacyPathsConfig(
  config: ServersConfig,
  serverId?: string,
): LegacyPathsConfig {
  const selectedServer = getServerInstance(config, serverId);

  return {
    workshopPath: config.workshopPath,
    iniFilePath: selectedServer?.iniPath ?? "",
  };
}

export function applyLegacyPathsConfig(
  config: ServersConfig,
  legacyPaths: LegacyPathsConfig,
): ServersConfig {
  const workshopPath = legacyPaths.workshopPath.trim();
  const iniFilePath = legacyPaths.iniFilePath.trim();

  const nextServers = config.servers.map((server) => ({
    ...server,
    stopCommands: [...server.stopCommands],
  }));

  if (iniFilePath) {
    ensureValidIniPath(iniFilePath, "iniFilePath");
    if (nextServers.length === 0) {
      const usedIds = new Set<string>();
      nextServers.push(createServerFromIniPath(iniFilePath, usedIds));
    } else {
      nextServers[0] = {
        ...nextServers[0],
        iniPath: iniFilePath,
      };
    }
  }

  return {
    workshopPath,
    stopGraceTimeoutMs: config.stopGraceTimeoutMs,
    forceKillTimeoutMs: config.forceKillTimeoutMs,
    servers: nextServers,
  };
}

export async function loadServersConfig(
  options: LoadServersConfigOptions = {},
): Promise<ServersConfig> {
  const serversConfigPath = options.serversConfigPath ?? SERVERS_CONFIG_FILE;
  const legacyPathsConfigPath =
    options.legacyPathsConfigPath ?? LEGACY_PATHS_CONFIG_FILE;

  const rawServersConfig = await readJsonIfExists(serversConfigPath);
  if (rawServersConfig !== null) {
    return normalizeServersConfig(rawServersConfig);
  }

  const rawLegacyConfig = await readJsonIfExists(legacyPathsConfigPath);
  const legacyConfig = normalizeLegacyPathsConfig(rawLegacyConfig);
  const migratedConfig = createMigratedConfig(legacyConfig, options.cliConfigPath);

  if (rawLegacyConfig !== null || migratedConfig.servers.length > 0) {
    await writeServersConfigFile(migratedConfig, serversConfigPath);
  }

  return migratedConfig;
}

export async function saveServersConfig(
  rawConfig: unknown,
  options: SaveServersConfigOptions = {},
): Promise<ServersConfig> {
  const serversConfigPath = options.serversConfigPath ?? SERVERS_CONFIG_FILE;
  const normalized = normalizeServersConfig(rawConfig);
  await writeServersConfigFile(normalized, serversConfigPath);
  return normalized;
}
