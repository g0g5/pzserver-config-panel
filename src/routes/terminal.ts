import express from "express";
import { loadServersConfig } from "../config/servers-config.js";
import { AppError, toErrorResponse } from "../errors/app-error.js";
import { ServerRuntimeManager } from "../runtime/manager.js";
import type { TerminalLine } from "../types/server.js";

function sendRouteError(error: unknown, res: express.Response): void {
  if (error instanceof AppError) {
    res.status(error.status).json(toErrorResponse(error));
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
}

export function createTerminalRouter(
  runtimeManager: ServerRuntimeManager,
  cliConfigPath?: string,
): express.Router {
  const router = express.Router();

  router.get("/servers/:id/terminal/stream", async (req, res) => {
    try {
      const config = await loadServersConfig({ cliConfigPath });
      const serverId = req.params.id.trim();
      const server = config.servers.find((item) => item.id === serverId);

      if (!server) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: `Server instance not found: ${serverId}` } });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const history = runtimeManager.subscribeTerminal(serverId, (line: TerminalLine) => {
        res.write(`data: ${JSON.stringify(line)}\n\n`);
      });

      for (const line of history) {
        res.write(`data: ${JSON.stringify(line)}\n\n`);
      }

      req.on("close", () => {
        runtimeManager.unsubscribeTerminal(serverId, (line: TerminalLine) => {
          res.write(`data: ${JSON.stringify(line)}\n\n`);
        });
      });
    } catch (error) {
      sendRouteError(error, res);
    }
  });

  router.post("/servers/:id/terminal/commands", express.json(), async (req, res) => {
    try {
      const config = await loadServersConfig({ cliConfigPath });
      const serverId = req.params.id.trim();
      const server = config.servers.find((item) => item.id === serverId);

      if (!server) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: `Server instance not found: ${serverId}` } });
        return;
      }

      const { text } = req.body;
      if (typeof text !== "string") {
        res.status(400).json({ error: { code: "BAD_REQUEST", message: "text must be a string" } });
        return;
      }

      const result = await runtimeManager.sendCommands(serverId, text);
      res.json(result);
    } catch (error) {
      sendRouteError(error, res);
    }
  });

  return router;
}
