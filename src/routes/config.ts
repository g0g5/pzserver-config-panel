import express from "express";
import { readConfig, saveConfig } from "../config/service.js";
import { AppError, toErrorResponse } from "../errors/app-error.js";

export function createConfigRouter(configPath: string): express.Router {
  const router = express.Router();

  router.get("/config", async (_req, res) => {
    try {
      const data = await readConfig(configPath);
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

  router.put("/config", async (req, res) => {
    try {
      const data = await saveConfig(configPath, req.body);
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

  return router;
}
