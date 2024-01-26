import type { CellData, RowData, SheetData } from "@nmemonica/x-spreadsheet";

export interface FilledSheetData extends SheetData {
  name: string;
  rows: {
    len: number;
    [key: number]: RowData;
  };
}

export function isFilledSheetData(sheet: SheetData): sheet is FilledSheetData {
  const s = sheet as FilledSheetData;

  const isValid =
    s.name !== undefined && s.rows.len >= 0 && Object.keys(s.rows).length > 0;

  return isValid;
}

export function getLastCellIdx(
  x: Record<number, RowData> | Record<number, CellData>
) {
  const largest = Object.keys(x).reduce(
    (big, x) => (big < Number(x) ? Number(x) : big),
    0
  );

  return largest;
}
