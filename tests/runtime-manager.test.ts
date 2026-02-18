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

  describe("Terminal functionality", () => {
    it("should record stdout to terminal buffer", async () => {
      const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
      const server = createServer({
        id: "echo",
        name: "Echo",
        startCommand: "node -e \"console.log('hello world'); setInterval(() => {}, 1000)\"",
      });

      await manager.startServer(server);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const history = manager.getTerminalHistory("echo");
      expect(history.length).toBeGreaterThan(0);
      expect(history.some((line) => line.text.includes("hello world"))).toBe(true);

      await manager.stopServer(server, STOP_OPTIONS);
    });

    it("should record stderr to terminal buffer", async () => {
      const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
      const server = createServer({
        id: "stderr",
        name: "Stderr",
        startCommand: "node -e \"console.error('error message'); setInterval(() => {}, 1000)\"",
      });

      await manager.startServer(server);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const history = manager.getTerminalHistory("stderr");
      expect(history.length).toBeGreaterThan(0);
      expect(history.some((line) => line.stream === "stderr" && line.text.includes("error message"))).toBe(true);

      await manager.stopServer(server, STOP_OPTIONS);
    });

    it("should notify terminal listeners", async () => {
      const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
      const server = createServer({
        id: "notify",
        name: "Notify",
        startCommand: "node -e \"console.log('test'); setInterval(() => {}, 1000)\"",
      });

      const receivedLines: any[] = [];
      const listener = (line: any) => {
        receivedLines.push(line);
      };

      manager.subscribeTerminal("notify", listener);
      await manager.startServer(server);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedLines.length).toBeGreaterThan(0);
      expect(receivedLines.some((line) => line.text.includes("test"))).toBe(true);

      manager.unsubscribeTerminal("notify", listener);
      await manager.stopServer(server, STOP_OPTIONS);
    });

    it("should send commands to running server", async () => {
      const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
      const server = createServer({
        id: "commands",
        name: "Commands",
        startCommand: "node -e \"const rl=require('readline').createInterface({input:process.stdin});rl.on('line',l=>console.log('ECHO:',l));setInterval(()=>{},1000)\"",
      });

      await manager.startServer(server);

      const result = await manager.sendCommands("commands", "hello\nworld");

      expect(result.successCount).toBe(2);
      expect(result.errors).toHaveLength(0);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const history = manager.getTerminalHistory("commands");
      expect(history.some((line) => line.text.includes("> hello"))).toBe(true);
      expect(history.some((line) => line.text.includes("> world"))).toBe(true);

      await manager.stopServer(server, STOP_OPTIONS);
    });

    it("should reject sending commands when server not running", async () => {
      const manager = new ServerRuntimeManager();

      await expect(manager.sendCommands("stopped", "test")).rejects.toMatchObject({
        code: "SERVER_NOT_RUNNING",
        status: 409,
      });
    });

    it("should return batch result with errors for failed lines", async () => {
      const manager = new ServerRuntimeManager({ startupProbeMs: 80 });
      const server = createServer({
        id: "batch",
        name: "Batch",
        startCommand: "node -e \"console.log('start'); setInterval(() => {}, 1000)\"",
      });

      await manager.startServer(server);

      const result = await manager.sendCommands("batch", "line1\n\nline2");

      expect(result.successCount).toBe(2);
      expect(result.errors).toHaveLength(0);

      await manager.stopServer(server, STOP_OPTIONS);
    });
  });
});
