export function exportToCSV(
  arg1: string | any[],
  arg2?: string[] | string,
  arg3?: (string | number)[][]
) {
  let filename = 'export.csv';
  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  if (Array.isArray(arg1)) {
    // Called as exportToCSV(dataArray, filename)
    filename = typeof arg2 === 'string' ? arg2 : 'export.csv';
    const data = arg1;
    if (data.length > 0) {
      headers = Object.keys(data[0]);
      rows = data.map(item => headers.map(h => item[h] ?? ''));
    }
  } else if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    // Called as exportToCSV(filename, headers, rows)
    filename = arg1;
    headers = arg2;
    rows = arg3;
  }

  const processRow = (row: (string | number)[]) => {
    return row.map(val => {
      let str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  };

  const csvContent = [
    processRow(headers),
    ...rows.map(processRow)
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

