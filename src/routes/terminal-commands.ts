import express from "express";
import { searchCommands } from "../rules/admin-commands.zh-CN.js";

export function createTerminalCommandsRouter(): express.Router {
  const router = express.Router();

  router.get("/terminal/commands", (req, res) => {
    const prefix = typeof req.query.prefix === "string" ? req.query.prefix : "";
    const commands = searchCommands(prefix);
    res.json({ commands });
  });

  return router;
}
