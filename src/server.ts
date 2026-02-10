import express from "express";
import { createHealthRouter, createConfigRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

type StartupOptions = {
  configPath: string;
  port: number;
};

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

function usage(): string {
  return "Usage: node dist/server.js --config <path> [--port <number>]";
}

function parsePort(rawPort: string): number {
  if (!/^\d+$/.test(rawPort)) {
    throw new Error("Invalid --port: must be an integer.");
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid --port: must be between 1 and 65535.");
  }

  return port;
}

function parseStartupOptions(argv: string[]): StartupOptions {
  let configPath: string | undefined;
  let port = DEFAULT_PORT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--config") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --config.");
      }

      configPath = value;
      i += 1;
      continue;
    }

    if (arg === "--port") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --port.");
      }

      port = parsePort(value);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!configPath) {
    throw new Error("Missing required argument: --config <path>.");
  }

  return { configPath, port };
}

let startupOptions: StartupOptions;
try {
  startupOptions = parseStartupOptions(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Argument error: ${message}`);
  console.error(usage());
  process.exit(1);
}

const app = express();

app.use(express.static("public"));
app.use(express.json());

app.use("/api", createHealthRouter());
app.use("/api", createConfigRouter(startupOptions.configPath));

app.use(errorHandler);

app.listen(startupOptions.port, HOST, () => {
  console.log(`Config file: ${startupOptions.configPath}`);
  console.log(
    `pzserver-config-panel listening on http://${HOST}:${startupOptions.port}`,
  );
});
