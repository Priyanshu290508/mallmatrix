/**
 * MALLMATRIX — Smart Import Web Worker
 * Offloads heavy file decoding (CSV text chunking, SheetJS parsing)
 * to a background thread to prevent UI freezing on large (up to 25MB) files.
 */

self.onmessage = async (e) => {
  const { fileBuffer, fileText, filename, extension, size } = e.data;

  try {
    if (extension === 'json') {
      const parsed = JSON.parse(fileText);
      const rows = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || [parsed]);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      self.postMessage({
        success: true,
        datasets: [{ name: filename, filename, headers, rows, size }]
      });
      return;
    }

    // Default fast RFC 4180 CSV parsing
    if (fileText) {
      let cleanText = fileText;
      if (cleanText.charCodeAt(0) === 0xFEFF) {
        cleanText = cleanText.slice(1);
      }

      const rows = [];
      let currentRow = [];
      let currentVal = '';
      let inQuotes = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentVal);
          currentVal = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentVal);
          currentVal = '';
          if (currentRow.some(c => c.trim().length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentVal += char;
        }
      }

      if (currentVal.length > 0 || currentRow.length > 0) {
        currentRow.push(currentVal);
        if (currentRow.some(c => c.trim().length > 0)) {
          rows.push(currentRow);
        }
      }

      if (rows.length === 0) {
        self.postMessage({ success: true, datasets: [] });
        return;
      }

      const headers = rows[0].map(h => h.trim());
      const dataRows = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = row[j] !== undefined ? row[j].trim() : '';
        }
        dataRows.push(obj);
      }

      self.postMessage({
        success: true,
        datasets: [{ name: filename, filename, headers, rows: dataRows, size }]
      });
      return;
    }

    self.postMessage({ success: false, error: 'No readable content received' });
  } catch (err) {
    self.postMessage({ success: false, error: err.message || 'Worker parsing error' });
  }
};

