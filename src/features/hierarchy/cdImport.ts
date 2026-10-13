// Pure parsing logic for the CD bulk-import dialog. The dialog reads the
// uploaded .csv/.xlsx file with the `xlsx` library into plain row objects
// (via XLSX.utils.sheet_to_json) and hands them here — kept separate so the
// column-detection and dedup rules are unit-testable without a real file.

const NAME_COLUMN_PATTERN = /^(nome|cd|name|centro de distribui(ç|c)(ã|a)o)$/i;

export function extractCdNames(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const nameKey = keys.find((k) => NAME_COLUMN_PATTERN.test(k.trim())) ?? keys[0];

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    const raw = row[nameKey];
    const name = typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}
