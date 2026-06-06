import * as XLSX from 'xlsx';

export interface CsvToMarkdownOptions {
  title?: string;
  hasHeader?: boolean; // default true
  maxRows?: number; // optional limit
}

/**
 * Convert CSV text to a Markdown table string.
 * Uses xlsx to robustly parse quoted fields, commas, and newlines.
 */
export function csvToMarkdownTable(csvText: string, options: CsvToMarkdownOptions = {}): string {
  const { title, hasHeader = true, maxRows } = options;
  const wb = XLSX.read(csvText || '', { type: 'string' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) {
    return hasHeader && title ? `### ${safeTitle(title)}\n\n(ไม่มีข้อมูลจาก CSV)\n` : '(ไม่มีข้อมูลจาก CSV)\n';
  }

  const limitedRows = typeof maxRows === 'number' ? rows.slice(0, maxRows) : rows;

  const headers = hasHeader ? limitedRows[0] : generateHeaders(limitedRows[0]?.length || 0);
  const dataRows = hasHeader ? limitedRows.slice(1) : limitedRows;

  const headerLine = `| ${headers.map(formatCell).join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = dataRows.map((row: any[]) => `| ${normalizeRow(row, headers.length).map(formatCell).join(' | ')} |`);

  const titleBlock = title ? `### ${safeTitle(title)}\n\n` : '';
  return `${titleBlock}${headerLine}\n${separatorLine}\n${bodyLines.join('\n')}\n`;
}

function generateHeaders(count: number): string[] {
  if (count <= 0) return ['Column 1'];
  return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
}

function normalizeRow(row: any[], targetLen: number): any[] {
  const arr = Array.isArray(row) ? row.slice() : [];
  while (arr.length < targetLen) arr.push('');
  if (arr.length > targetLen) arr.length = targetLen;
  return arr;
}

function formatCell(value: any): string {
  const text = String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return text.trim();
}

function safeTitle(name: string): string {
  return String(name).replace(/\.[^/.]+$/, '');
}

