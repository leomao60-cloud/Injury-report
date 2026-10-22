/**
 * A small RFC 4180 CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes,
 * CRLF or LF line endings, and a leading byte-order mark. Also accepts tab-separated text, which is
 * what you get when you copy cells out of Excel or Google Sheets.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(new RegExp('^\\uFEFF'), '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delimiter = firstLine.split('\t').length > firstLine.split(',').length ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines (Excel adds them at the end).
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Write rows back out as CSV (used for the "export cutup list" download). */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}
