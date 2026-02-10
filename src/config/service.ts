import { readConfigText, writeConfigText } from "./encoding.js";
import { parseIniText } from "./ini-parser.js";
import { getPzKeyZhInfo } from "../rules/pz-keys.zh-CN.js";
import { serializeConfigItems } from "./serializer.js";
import { withLock } from "./lock.js";
import { createBackup } from "./backup.js";
import { AppError } from "../errors/app-error.js";
import type { GetConfigResponseDto, PutConfigRequestDto, PutConfigResponseDto, ConfigMeta } from "../types/config.js";

export async function readConfig(configPath: string): Promise<GetConfigResponseDto> {
  const { text, meta } = await readConfigText(configPath);
  const parsedItems = parseIniText(text);

  const items = parsedItems.map((item) => {
    const zhInfo = getPzKeyZhInfo(item.key);
    return {
      ...item,
      zhName: zhInfo?.zhName ?? null,
      description: zhInfo?.description ?? null,
      isKnown: zhInfo !== null,
    };
  });

  return {
    configPath,
    items,
    meta,
  };
}

function validatePutRequestDto(dto: PutConfigRequestDto): void {
  if (!dto || typeof dto !== "object") {
    throw new AppError("BAD_REQUEST", "Request body must be an object");
  }

  if (!Array.isArray(dto.items)) {
    throw new AppError("BAD_REQUEST", "Request body must contain 'items' array");
  }

  for (let i = 0; i < dto.items.length; i++) {
    const item = dto.items[i];
    if (!item || typeof item !== "object") {
      throw new AppError("BAD_REQUEST", `Item at index ${i} must be an object`);
    }

    if (typeof item.key !== "string" || item.key.trim() === "") {
      throw new AppError("BAD_REQUEST", `Item at index ${i} must have a non-empty 'key' string`);
    }

    if (typeof item.value !== "string") {
      throw new AppError("BAD_REQUEST", `Item at index ${i} must have a 'value' string`);
    }
  }
}

async function getOrCreateConfigMeta(configPath: string): Promise<ConfigMeta> {
  try {
    const { meta } = await readConfigText(configPath);
    return meta;
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return {
        encoding: "utf8",
        newline: "lf",
      };
    }
    throw error;
  }
}

export async function saveConfig(configPath: string, dto: PutConfigRequestDto): Promise<PutConfigResponseDto> {
  validatePutRequestDto(dto);

  const meta = await getOrCreateConfigMeta(configPath);

  await withLock(configPath, async () => {
    const { readFile, writeFile } = await import("node:fs/promises");

    try {
      const content = await readFile(configPath);
      const backupPath = `${configPath}.bak`;
      await writeFile(backupPath, content);
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno?.code !== "ENOENT") {
        throw new AppError("IO_ERROR", `Failed to create backup: ${configPath}`);
      }
    }

    const serializedText = serializeConfigItems(dto.items, meta.newline);
    await writeConfigText(configPath, serializedText, meta);
  });

  return {
    ok: true,
  };
}
