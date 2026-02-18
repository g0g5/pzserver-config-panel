import express from "express";
import {
  loadServersConfig,
  saveServersConfig,
} from "../config/servers-config.js";
import { AppError, toErrorResponse } from "../errors/app-error.js";

function sendRouteError(error: unknown, res: express.Response): void {
  if (error instanceof AppError) {
    res.status(error.status).json(toErrorResponse(error));
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
}

export function createServersConfigRouter(cliConfigPath?: string): express.Router {
  const router = express.Router();

  router.get("/servers-config", async (_req, res) => {
    try {
      const config = await loadServersConfig({ cliConfigPath });
      res.json(config);
    } catch (error) {
      sendRouteError(error, res);
    }
  });

  router.put("/servers-config", async (req, res) => {
    try {
      const saved = await saveServersConfig(req.body);
      res.json(saved);
    } catch (error) {
      sendRouteError(error, res);
    }
  });

  return router;
}
