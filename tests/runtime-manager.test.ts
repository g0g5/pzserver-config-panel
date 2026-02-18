import { describe, it, expect } from "vitest";
import { ServerRuntimeManager } from "../src/runtime/manager.js";
import type { ServerInstance } from "../src/types/server.js";

const STOP_OPTIONS = {
  stopGraceTimeoutMs: 100,
  forceKillTimeoutMs: 500,
};

function createServer(overrides: Partial<ServerInstance>): ServerInstance {
  return {
    id: "server",
    name: "server",
    iniPath: "/tmp/server.ini",
    startCommand: "node -e \"setInterval(() => {}, 1000)\"",
    stopCommands: ["save", "quit"],
    ...overrides,
  };
}

describe("ServerRuntimeManager", () => {
  it("returns stopped state for unstarted servers", () => {
    const manager = new ServerRuntimeManager();
    const serverA = createServer({ id: "a", name: "A" });
    const serverB = createServer({ id: "b", name: "B" });

    const snapshot = manager.getRuntimeSnapshot([serverA, serverB]);

    expect(snapshot.activeServerId).toBeNull();
    expect(snapshot.servers).toEqual([
      {
        serverId: "a",
        status: "stopped",
        pid: null,
        startedAt: null,
        lastExit: null,
      },
      {
        serverId: "b",
        status: "stopped",
        pid: null,
        startedAt: null,
        lastExit: null,
      },
    ]);
  });

  it("enforces single-active runtime control", async () => {
    const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
    const serverA = createServer({ id: "a", name: "A" });
    const serverB = createServer({ id: "b", name: "B" });

    await manager.startServer(serverA);

    await expect(manager.startServer(serverB)).rejects.toMatchObject({
      code: "ANOTHER_SERVER_RUNNING",
      status: 409,
    });

    const snapshot = manager.getRuntimeSnapshot([serverA, serverB]);
    expect(snapshot.activeServerId).toBe("a");
    expect(snapshot.servers[0].status).toBe("running");

    await manager.stopServer(serverA, STOP_OPTIONS);
  });

  it("rejects duplicate start on same server", async () => {
    const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
    const server = createServer({ id: "main", name: "Main" });

    await manager.startServer(server);

    await expect(manager.startServer(server)).rejects.toMatchObject({
      code: "SERVER_ALREADY_RUNNING",
      status: 409,
    });

    await manager.stopServer(server, STOP_OPTIONS);
  });

  it("returns SERVER_NOT_RUNNING when stopping stopped server", async () => {
    const manager = new ServerRuntimeManager();
    const server = createServer({ id: "stopped", name: "Stopped" });

    await expect(manager.stopServer(server, STOP_OPTIONS)).rejects.toMatchObject({
      code: "SERVER_NOT_RUNNING",
      status: 409,
    });
  });

  it("marks immediate start exit as PROCESS_SPAWN_FAILED", async () => {
    const manager = new ServerRuntimeManager({ startupProbeMs: 120 });
    const server = createServer({
      id: "failing",
      name: "Failing",
      startCommand: "node -e \"process.exit(1)\"",
    });

    await expect(manager.startServer(server)).rejects.toMatchObject({
      code: "PROCESS_SPAWN_FAILED",
      status: 500,
    });

    const snapshot = manager.getRuntimeSnapshot([server]);
    expect(snapshot.activeServerId).toBeNull();
    expect(snapshot.servers[0].status).toBe("error");
    expect(snapshot.servers[0].lastExit).not.toBeNull();
  });
});
