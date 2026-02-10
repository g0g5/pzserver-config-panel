import { readFile, writeFile, stat, unlink } from "node:fs/promises";

import { AppError } from "../errors/app-error";

const LOCK_TIMEOUT_MS = 60 * 60 * 1000;

export function getLockPath(filePath: string): string {
  return `${filePath}.lock`;
}

export async function acquireLock(filePath: string): Promise<(() => Promise<void>)> {
  const lockPath = getLockPath(filePath);
  const now = Date.now();

  try {
    const lockStat = await stat(lockPath);
    const lockAge = now - lockStat.mtimeMs;

    if (lockAge < LOCK_TIMEOUT_MS) {
      throw new AppError(
        "FILE_LOCKED",
        `Config file is locked: ${filePath}`,
      );
    }

    await unlink(lockPath);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const maybeErrno = error as NodeJS.ErrnoException;
    if (maybeErrno?.code !== "ENOENT") {
      throw new AppError(
        "IO_ERROR",
        `Failed to check lock file: ${lockPath}`,
      );
    }
  }

  try {
    await writeFile(lockPath, `${process.pid}`, { flag: "wx" });
  } catch (error) {
    const maybeErrno = error as NodeJS.ErrnoException;
    if (maybeErrno?.code === "EEXIST") {
      throw new AppError(
        "FILE_LOCKED",
        `Config file is locked: ${filePath}`,
      );
    }
    throw new AppError(
      "IO_ERROR",
      `Failed to create lock file: ${lockPath}`,
    );
  }

  const releaseLock = async (): Promise<void> => {
    try {
      await unlink(lockPath);
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno?.code !== "ENOENT") {
        throw new AppError(
          "IO_ERROR",
          `Failed to release lock file: ${lockPath}`,
        );
      }
    }
  };

  return releaseLock;
}

export async function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const releaseLock = await acquireLock(filePath);

  try {
    return await fn();
  } finally {
    await releaseLock();
  }
}
