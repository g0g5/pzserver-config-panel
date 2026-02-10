import { describe, it, expect } from "vitest";
import { serializeConfigItems } from "../src/config/serializer.js";
import type { ConfigItem } from "../src/types/config.js";

describe("serializeConfigItems", () => {
  it("should sort keys alphabetically", () => {
    const items: ConfigItem[] = [
      { key: "ZKey", value: "value3" },
      { key: "AKey", value: "value1" },
      { key: "BKey", value: "value2" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("AKey=value1\nBKey=value2\nZKey=value3");
  });

  it("should handle Mods field with semicolon-separated values", () => {
    const items: ConfigItem[] = [
      { key: "Mods", value: "mod1; mod2 ;mod3" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("Mods=mod1;mod2;mod3");
  });

  it("should handle WorkshopItems field with semicolon-separated values", () => {
    const items: ConfigItem[] = [
      { key: "WorkshopItems", value: "item1;item2; item3" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("WorkshopItems=item1;item2;item3");
  });

  it("should discard empty items in Mods field", () => {
    const items: ConfigItem[] = [
      { key: "Mods", value: "mod1;;mod2; ;mod3" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("Mods=mod1;mod2;mod3");
  });

  it("should discard empty items in WorkshopItems field", () => {
    const items: ConfigItem[] = [
      { key: "WorkshopItems", value: "item1; ;item2;;" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("WorkshopItems=item1;item2");
  });

  it("should handle LF newline style", () => {
    const items: ConfigItem[] = [
      { key: "AKey", value: "value1" },
      { key: "BKey", value: "value2" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("AKey=value1\nBKey=value2");
  });

  it("should handle CRLF newline style", () => {
    const items: ConfigItem[] = [
      { key: "AKey", value: "value1" },
      { key: "BKey", value: "value2" },
    ];

    const result = serializeConfigItems(items, "crlf");
    expect(result).toBe("AKey=value1\r\nBKey=value2");
  });

  it("should not modify non-special fields", () => {
    const items: ConfigItem[] = [
      { key: "TestKey", value: "some value with spaces" },
      { key: "AnotherKey", value: "value;with;semicolons" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("AnotherKey=value;with;semicolons\nTestKey=some value with spaces");
  });

  it("should handle empty Mods field", () => {
    const items: ConfigItem[] = [
      { key: "Mods", value: "" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("Mods=");
  });

  it("should handle empty WorkshopItems field", () => {
    const items: ConfigItem[] = [
      { key: "WorkshopItems", value: "" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe("WorkshopItems=");
  });

  it("should handle mixed special and normal keys with proper sorting", () => {
    const items: ConfigItem[] = [
      { key: "ZKey", value: "zvalue" },
      { key: "Mods", value: "mod1; mod2" },
      { key: "AKey", value: "avalue" },
      { key: "WorkshopItems", value: "item1;item2" },
    ];

    const result = serializeConfigItems(items, "lf");
    expect(result).toBe(
      "AKey=avalue\n" +
      "Mods=mod1;mod2\n" +
      "WorkshopItems=item1;item2\n" +
      "ZKey=zvalue"
    );
  });
});
