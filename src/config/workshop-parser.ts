import { readdir, readFile, access, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { WorkshopItem, SubMod } from "../types/config.js";

function parseModInfo(content: string, folderPath: string): SubMod | null {
  const lines = content.split(/\r?\n/);
  const result: Partial<SubMod> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (key === "name") result.name = value;
    if (key === "id") result.id = value;
    if (key === "description") result.description = value;
    if (key === "poster") result.poster = value;
  }

  if (!result.name || !result.id) return null;

  const posterPath = result.poster ? join(folderPath, result.poster) : "";
  const hasPoster = posterPath && existsSync(posterPath);

  return {
    name: result.name,
    id: result.id,
    description: result.description ?? "",
    poster: hasPoster ? posterPath : "",
    path: folderPath,
  };
}

async function findModInfoFiles(dirPath: string): Promise<Array<{ path: string; mtime: Date }>> {
  const modInfoFiles: Array<{ path: string; mtime: Date }> = [];

  async function search(currentPath: string) {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await search(fullPath);
        } else if (entry.name.toLowerCase() === "mod.info") {
          try {
            const fileStat = await stat(fullPath);
            modInfoFiles.push({ path: fullPath, mtime: fileStat.mtime });
          } catch (error) {
            console.warn(`[Workshop Parser] Failed to get stat for: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[Workshop Parser] Failed to read directory: ${currentPath}`);
    }
  }

  await search(dirPath);
  return modInfoFiles;
}

async function parseWorkshopItem(workshopPath: string, itemId: string): Promise<WorkshopItem> {
  const itemPath = join(workshopPath, itemId);
  const isDownloaded = existsSync(itemPath);

  if (!isDownloaded) {
    return {
      id: itemId,
      isDownloaded: false,
      subMods: [],
    };
  }

  const modInfoFiles = await findModInfoFiles(itemPath);
  const subModsMap = new Map<string, { subMod: SubMod; mtime: Date }>();

  for (const { path: modInfoFile, mtime } of modInfoFiles) {
    try {
      const content = await readFile(modInfoFile, "utf8");
      const folderPath = modInfoFile.replace(/\\mod\.info$/i, "");
      const subMod = parseModInfo(content, folderPath);
      if (subMod) {
        const existing = subModsMap.get(subMod.id);
        if (!existing || mtime > existing.mtime) {
          subModsMap.set(subMod.id, { subMod, mtime });
        }
      }
    } catch (error) {
      console.warn(`[Workshop Parser] Failed to parse mod.info: ${modInfoFile}`);
    }
  }

  const subMods = Array.from(subModsMap.values()).map(({ subMod }) => subMod);

  return {
    id: itemId,
    isDownloaded: true,
    subMods,
  };
}

export async function parseWorkshopItems(workshopPath: string, itemIds: string[]): Promise<WorkshopItem[]> {
  const results: WorkshopItem[] = [];

  for (const itemId of itemIds) {
    const workshopItem = await parseWorkshopItem(workshopPath, itemId);
    results.push(workshopItem);
  }

  return results;
}