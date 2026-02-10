import express from "express";
import { readConfig, saveConfig } from "../config/service.js";
import { AppError, toErrorResponse } from "../errors/app-error.js";
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseWorkshopItems } from "../config/workshop-parser.js";
import { relative, resolve } from "node:path";
import type { WorkshopItem } from "../types/config.js";

type PathsConfig = {
  workshopPath: string;
  iniFilePath: string;
};

const PATHS_CONFIG_FILE = "./paths-config.json";

let pathsConfig: PathsConfig = {
  workshopPath: "",
  iniFilePath: ""
};

// 加载路径配置
async function loadPathsConfig() {
  try {
    if (existsSync(PATHS_CONFIG_FILE)) {
      const content = await readFile(PATHS_CONFIG_FILE, "utf8");
      pathsConfig = JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to load paths config:", error);
  }
}

// 保存路径配置
async function savePathsConfig() {
  try {
    await writeFile(PATHS_CONFIG_FILE, JSON.stringify(pathsConfig, null, 2));
  } catch (error) {
    console.error("Failed to save paths config:", error);
  }
}

// 初始化时加载路径配置
loadPathsConfig().catch(console.error);

export function createConfigRouter(configPath?: string): express.Router {
  const router = express.Router();

  // 如果iniFilePath尚未设置，且提供了configPath，则使用命令行参数传递的configPath
  if (!pathsConfig.iniFilePath && configPath) {
    pathsConfig.iniFilePath = configPath;
    // 保存到文件
    savePathsConfig().catch(console.error);
  }

  router.get("/config", async (_req, res) => {
    try {
      // 使用pathsConfig.iniFilePath或configPath
      const actualConfigPath = pathsConfig.iniFilePath || configPath;
      if (!actualConfigPath) {
        throw new AppError("BAD_REQUEST", "No config path provided and no saved path found");
      }
      
      const data = await readConfig(actualConfigPath);
      
      let workshopItems: WorkshopItem[] = [];
      const workshopItemsItem = data.items.find((item) => item.key === "WorkshopItems");
      
      if (workshopItemsItem && workshopItemsItem.value) {
        const itemIds = workshopItemsItem.value.split(";").map((s) => s.trim()).filter((s) => s);
        
        if (pathsConfig.workshopPath && itemIds.length > 0) {
          workshopItems = await parseWorkshopItems(pathsConfig.workshopPath, itemIds);
        } else {
          workshopItems = itemIds.map((id) => ({
            id,
            isDownloaded: false,
            subMods: [],
          }));
        }
      }
      
      res.json({ ...data, workshopItems });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.status).json(toErrorResponse(error));
      } else {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
      }
    }
  });

  router.put("/config", async (req, res) => {
    try {
      // 使用pathsConfig.iniFilePath或configPath
      const actualConfigPath = pathsConfig.iniFilePath || configPath;
      if (!actualConfigPath) {
        throw new AppError("BAD_REQUEST", "No config path provided and no saved path found");
      }
      
      const data = await saveConfig(actualConfigPath, req.body);
      res.json(data);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.status).json(toErrorResponse(error));
      } else {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
      }
    }
  });

  router.get("/workshop-poster", async (req, res) => {
    try {
      if (!pathsConfig.workshopPath) {
        throw new AppError("BAD_REQUEST", "Workshop path is not configured");
      }

      const rel = typeof req.query.rel === "string" ? req.query.rel : "";
      const legacyPath = typeof req.query.path === "string" ? req.query.path : "";

      if (!rel && !legacyPath) {
        throw new AppError("BAD_REQUEST", "rel parameter is required");
      }

      const rootAbs = resolve(pathsConfig.workshopPath);
      const candidateAbs = rel ? resolve(rootAbs, rel) : resolve(legacyPath);

      const relToRoot = relative(rootAbs, candidateAbs).replace(/\\/g, "/");
      const isUnderRoot = !!relToRoot && relToRoot !== ".." && !relToRoot.startsWith("../");
      if (!isUnderRoot) {
        throw new AppError("BAD_REQUEST", "Invalid poster path");
      }

      try {
        const fileStat = await stat(candidateAbs);
        if (!fileStat.isFile()) {
          throw new AppError("NOT_FOUND", "Poster file not found");
        }
      } catch {
        throw new AppError("NOT_FOUND", "Poster file not found");
      }

      res.sendFile(candidateAbs);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.status).json(toErrorResponse(error));
      } else {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
      }
    }
  });

  router.get("/paths", async (_req, res) => {
    try {
      res.json(pathsConfig);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.status).json(toErrorResponse(error));
      } else {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
      }
    }
  });

  router.put("/paths", async (req, res) => {
    try {
      const { workshopPath, iniFilePath } = req.body;
      
      if (typeof workshopPath !== "string" || typeof iniFilePath !== "string") {
        throw new AppError("BAD_REQUEST", "Invalid paths configuration");
      }
      
      pathsConfig = {
        workshopPath,
        iniFilePath
      };
      
      // 持久化保存路径配置
      await savePathsConfig();
      
      res.json({ ok: true, paths: pathsConfig });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.status).json(toErrorResponse(error));
      } else {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
      }
    }
  });

  return router;
}
