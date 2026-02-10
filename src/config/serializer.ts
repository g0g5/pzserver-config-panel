import type { ConfigItem, ConfigNewline } from "../types/config.js";

const SPECIAL_KEYS = ["Mods", "WorkshopItems"] as const;
const SPECIAL_KEY_SET = new Set<string>(SPECIAL_KEYS);

function normalizeSpecialValue(value: string): string {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(";");
}

function normalizeItem(item: ConfigItem): ConfigItem {
  if (SPECIAL_KEY_SET.has(item.key)) {
    return {
      key: item.key,
      value: normalizeSpecialValue(item.value),
    };
  }
  return item;
}

export function serializeConfigItems(items: ConfigItem[], newline: ConfigNewline): string {
  const normalizedItems = items.map(normalizeItem);
  const sortedItems = [...normalizedItems].sort((a, b) => a.key.localeCompare(b.key));
  const lineSeparator = newline === "crlf" ? "\r\n" : "\n";
  return sortedItems.map((item) => `${item.key}=${item.value}`).join(lineSeparator);
}
