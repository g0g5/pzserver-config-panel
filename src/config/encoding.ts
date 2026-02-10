import { readFile, writeFile } from "node:fs/promises";

import { AppError } from "../errors/app-error";
import type { ConfigEncoding, ConfigMeta, ConfigNewline } from "../types/config";

export type ReadConfigTextResult = {
  text: string;
  meta: ConfigMeta;
};

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function hasUtf8Bom(buffer: Buffer): boolean {
  return (
    buffer.length >= UTF8_BOM.length &&
    buffer[0] === UTF8_BOM[0] &&
    buffer[1] === UTF8_BOM[1] &&
    buffer[2] === UTF8_BOM[2]
  );
}

function hasUnsupportedBom(buffer: Buffer): boolean {
  return (
    (buffer.length >= 2 &&
      ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
        (buffer[0] === 0xfe && buffer[1] === 0xff))) ||
    (buffer.length >= 4 &&
      ((buffer[0] === 0x00 &&
        buffer[1] === 0x00 &&
        buffer[2] === 0xfe &&
        buffer[3] === 0xff) ||
        (buffer[0] === 0xff &&
          buffer[1] === 0xfe &&
          buffer[2] === 0x00 &&
          buffer[3] === 0x00)))
  );
}

function detectEncoding(buffer: Buffer): ConfigEncoding {
  return hasUtf8Bom(buffer) ? "utf8-bom" : "utf8";
}

function detectNewline(text: string): ConfigNewline {
  return text.includes("\r\n") ? "crlf" : "lf";
}

function decodeUtf8Strict(buffer: Buffer, filePath: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new AppError(
      "ENCODING_UNSUPPORTED",
      `Unsupported config encoding for safe handling: ${filePath}`,
    );
  }
}

function withNewlineStyle(text: string, newline: ConfigNewline): string {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return newline === "crlf"
    ? normalizedText.replace(/\n/g, "\r\n")
    : normalizedText;
}

function toIoError(error: unknown, filePath: string, action: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const maybeErrno = error as NodeJS.ErrnoException;
  if (maybeErrno?.code === "ENOENT") {
    return new AppError("NOT_FOUND", `Config file not found: ${filePath}`);
  }

  return new AppError("IO_ERROR", `Failed to ${action} config file: ${filePath}`);
}

export async function readConfigText(filePath: string): Promise<ReadConfigTextResult> {
  let fileBuffer: Buffer;

  try {
    fileBuffer = await readFile(filePath);
  } catch (error) {
    throw toIoError(error, filePath, "read");
  }

  if (hasUnsupportedBom(fileBuffer)) {
    throw new AppError(
      "ENCODING_UNSUPPORTED",
      `Unsupported config encoding for safe handling: ${filePath}`,
    );
  }

  const encoding = detectEncoding(fileBuffer);
  const contentBuffer = encoding === "utf8-bom" ? fileBuffer.subarray(3) : fileBuffer;
  const text = decodeUtf8Strict(contentBuffer, filePath);
  const newline = detectNewline(text);

  return {
    text,
    meta: {
      encoding,
      newline,
    },
  };
}

export async function writeConfigText(
  filePath: string,
  text: string,
  meta: ConfigMeta,
): Promise<void> {
  const normalizedText = withNewlineStyle(text, meta.newline);
  const textBuffer = Buffer.from(normalizedText, "utf8");
  const outputBuffer =
    meta.encoding === "utf8-bom"
      ? Buffer.concat([UTF8_BOM, textBuffer])
      : textBuffer;

  try {
    await writeFile(filePath, outputBuffer);
  } catch (error) {
    throw toIoError(error, filePath, "write");
  }
}
