import type { ConfigItem } from "../types/config.js";

export function parseIniText(text: string): ConfigItem[] {
  const items: ConfigItem[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      console.warn(`[INI Parser] Line ${i + 1}: Invalid format (missing '='): ${trimmed}`);
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (key === "") {
      console.warn(`[INI Parser] Line ${i + 1}: Empty key: ${trimmed}`);
      continue;
    }

    items.push({ key, value });
  }

  return items;
}

export function serializeIniItems(items: ConfigItem[]): string {
  return items.map((item) => `${item.key}=${item.value}`).join("\n");
}
