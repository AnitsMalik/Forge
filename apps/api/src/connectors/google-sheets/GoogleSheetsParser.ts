export class GoogleSheetsParser {
  parseRows(rows: string[][], headerRowIndex = 0) {
    if (!rows.length) return [];
    const headers = rows[headerRowIndex];
    return rows.slice(headerRowIndex + 1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] || '';
      });
      return obj;
    });
  }
}
