export type CsvRecord = Record<string, string>;

const normalizeCsvKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export const slugify = (value: string) => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export'
);

export const timestampSlug = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map(row => row.map(value => {
      const text = value === null || value === undefined ? '' : String(value);
      const escaped = text.replace(/"/g, '""');
      return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(','))
    .join('\r\n');
}

export function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  downloadText(filename, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8');
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, '').trim());
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, '').trim());
    rows.push(row);
  }

  return rows.filter(current => current.some(cell => cell.trim() !== ''));
}

export function csvRowsToRecords(rows: string[][]): CsvRecord[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeCsvKey);
  return rows.slice(1).map(row => headers.reduce<CsvRecord>((record, key, index) => {
    if (key) record[key] = row[index] ?? '';
    return record;
  }, {}));
}

export function getRecordValue(record: CsvRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[normalizeCsvKey(key)];
    if (value?.trim()) return value.trim();
  }
  return '';
}
