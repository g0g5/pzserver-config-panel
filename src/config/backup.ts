import { readFile, writeFile } from "node:fs/promises";

import { AppError } from "../errors/app-error";

export function getBackupPath(filePath: string): string {
  return `${filePath}.bak`;
}

export async function createBackup(filePath: string): Promise<void> {
  const backupPath = getBackupPath(filePath);

  try {
    const content = await readFile(filePath);
    await writeFile(backupPath, content);
  } catch (error) {
    const maybeErrno = error as NodeJS.ErrnoException;
    if (maybeErrno?.code === "ENOENT") {
      throw new AppError(
        "IO_ERROR",
        `Cannot create backup: source file not found: ${filePath}`,
      );
    }
    throw new AppError(
      "IO_ERROR",
      `Failed to create backup: ${backupPath}`,
    );
  }
}
