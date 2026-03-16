const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('backend/media/rosters/roster_20260314_105551_sample_roster.xlsx');
  const ws = workbook.worksheets[0];
  ws.eachRow((row, rowNum) => {
    if (rowNum < 5) {
      console.log(`Row ${rowNum}`);
      row.eachCell((cell, colNum) => {
        console.log(`  Col ${colNum}:`, cell.value, 'Type:', typeof cell.value);
      });
    }
  });
}
run();
