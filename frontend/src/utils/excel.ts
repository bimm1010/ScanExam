/**
 * Converts a 1-based column index to its Excel-style letter representation (A, B, C, ..., AA, AB, ...).
 */
export const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  while (colIndex > 0) {
    const temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
};
