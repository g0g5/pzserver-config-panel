import type { TerminalLine } from "../types/server.js";

const MAX_BUFFER_SIZE = 2000;

export class TerminalRingBuffer {
  private readonly buffer: TerminalLine[] = [];

  public append(line: TerminalLine): void {
    this.buffer.push(line);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  public getSnapshot(): TerminalLine[] {
    return [...this.buffer];
  }

  public getLinesSince(index: number): TerminalLine[] {
    if (index >= this.buffer.length) {
      return [];
    }
    return this.buffer.slice(index);
  }

  public get currentSize(): number {
    return this.buffer.length;
  }
}
