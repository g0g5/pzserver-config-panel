import express from "express";
import { AppError, toErrorResponse } from "../errors/app-error.js";

export function errorHandler(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json(toErrorResponse(err));
  } else {
    const message = err.message || "Internal server error";
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
}
