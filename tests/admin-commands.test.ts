import { describe, it, expect } from "vitest";
import { searchCommands, ADMIN_COMMANDS } from "../src/rules/admin-commands.zh-CN.js";

describe("Admin Commands", () => {
  describe("searchCommands", () => {
    it("should return empty array for empty prefix", () => {
      const result = searchCommands("");
      expect(result).toHaveLength(0);
    });

    it("should match command by prefix", () => {
      const result = searchCommands("play");
      expect(result.some((cmd) => cmd.command === "players")).toBe(true);
    });

    it("should be case insensitive", () => {
      const result1 = searchCommands("PLAYERS");
      const result2 = searchCommands("players");
      const result3 = searchCommands("PlAyErS");

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should match aliases", () => {
      const result = searchCommands("godmode");
      expect(result.some((cmd) => cmd.command === "godmod")).toBe(true);
    });

    it("should return multiple matches", () => {
      const result = searchCommands("start");
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((cmd) => cmd.command === "startrain")).toBe(true);
      expect(result.some((cmd) => cmd.command === "startstorm")).toBe(true);
    });

    it("should return command with all required fields", () => {
      const result = searchCommands("save");
      const saveCommand = result.find((cmd) => cmd.command === "save");

      expect(saveCommand).toBeDefined();
      expect(saveCommand?.description).toBe("保存世界");
      expect(saveCommand?.usage).toBe("save");
    });
  });

  describe("ADMIN_COMMANDS list", () => {
    it("should contain common commands", () => {
      const commands = ADMIN_COMMANDS.map((cmd) => cmd.command);
      expect(commands).toContain("players");
      expect(commands).toContain("save");
      expect(commands).toContain("quit");
      expect(commands).toContain("additem");
      expect(commands).toContain("banuser");
    });

    it("should have description and usage for all commands", () => {
      for (const cmd of ADMIN_COMMANDS) {
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
        expect(cmd.usage).toBeDefined();
        expect(cmd.usage.length).toBeGreaterThan(0);
      }
    });
  });
});
