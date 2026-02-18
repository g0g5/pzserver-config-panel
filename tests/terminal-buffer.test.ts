import { describe, it, expect, beforeEach } from "vitest";
import { TerminalRingBuffer } from "../src/runtime/terminal-buffer.js";
import type { TerminalLine } from "../src/types/server.js";

describe("TerminalRingBuffer", () => {
  let buffer: TerminalRingBuffer;

  beforeEach(() => {
    buffer = new TerminalRingBuffer();
  });

  it("should append lines to buffer", () => {
    const line: TerminalLine = {
      timestamp: new Date().toISOString(),
      stream: "stdout",
      text: "test line",
    };

    buffer.append(line);
    const snapshot = buffer.getSnapshot();

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toEqual(line);
  });

  it("should maintain maximum buffer size of 2000 lines", () => {
    for (let i = 0; i < 2005; i += 1) {
      buffer.append({
        timestamp: new Date().toISOString(),
        stream: "stdout",
        text: `line ${i}`,
      });
    }

    expect(buffer.currentSize).toBe(2000);
    expect(buffer.getSnapshot()[0].text).toBe("line 5");
  });

  it("should return lines since index", () => {
    for (let i = 0; i < 5; i += 1) {
      buffer.append({
        timestamp: new Date().toISOString(),
        stream: "stdout",
        text: `line ${i}`,
      });
    }

    const lines = buffer.getLinesSince(2);
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe("line 2");
    expect(lines[2].text).toBe("line 4");
  });

  it("should return empty array when index is beyond buffer size", () => {
    buffer.append({
      timestamp: new Date().toISOString(),
      stream: "stdout",
      text: "line 0",
    });

    const lines = buffer.getLinesSince(5);
    expect(lines).toHaveLength(0);
  });

  it("should return snapshot copy, not reference", () => {
    buffer.append({
      timestamp: new Date().toISOString(),
      stream: "stdout",
      text: "original",
    });

    const snapshot1 = buffer.getSnapshot();
    buffer.append({
      timestamp: new Date().toISOString(),
      stream: "stdout",
      text: "new",
    });
    const snapshot2 = buffer.getSnapshot();

    expect(snapshot1).toHaveLength(1);
    expect(snapshot2).toHaveLength(2);
  });
});
