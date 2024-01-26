// import fs from "node:fs";
// import readline from "node:readline";
import { type FilledSheetData } from "./sheetHelper.js";
// import { fileURLToPath } from "url";
// import path from "node:path";

export interface CSVOptions {
  delimiter?: string;
  name?: string;
}

/** Empty row only ,,, */
const noDataRegEx = new RegExp(/^,*$/);
/** Double quote replacement */
const doubleQuoteValue = '""';
const doubleQuoteToken = "\u0002";
const singleQuoteValue = '"';
const singleQuoteToken = '"';
const lineEndToken = "\r\n";

export function csvToObject<
  T extends { on: (p: string, fn: (line: string) => void) => void },
>(event: T, sheetName: string, options?: CSVOptions): Promise<FilledSheetData> {
  const { delimiter = ",", name: nameOverride } = options ?? {};

  return new Promise((resolve, reject) => {
    try {
      let sheet: FilledSheetData = {
        name: nameOverride ?? sheetName,
        rows: { len: 0 },
      };

      let y = 0;
      let multiline = "";

      event.on("line", (line) => {
        let l = line;
        if (noDataRegEx.test(l)) {
          // no data skip row
          sheet.rows[y] = { cells: {} };
          y++;
          return sheet;
        }

        if (
          line.includes(singleQuoteToken) &&
          (line.split(singleQuoteToken).length + 1) % 2 !== 0 &&
          multiline === ""
        ) {
          // start

          multiline += l;
          return sheet;
        } else if (
          line.includes(singleQuoteToken) &&
          (line.split(singleQuoteToken).length + 1) % 2 === 0 &&
          multiline !== ""
        ) {
          // mid

          multiline += "\n" + l;
          return sheet;
        } else if (!line.includes(singleQuoteToken) && multiline !== "") {
          // mid

          multiline += "\n" + l;
          return sheet;
        } else if (
          line.includes(singleQuoteToken) &&
          (line.split(singleQuoteToken).length + 1) % 2 !== 0 &&
          multiline !== ""
        ) {
          // end

          l = multiline + "\n" + l;
          multiline = "";
        }

        const row = lineParser(l, delimiter);

        sheet.rows[y] = row;
        sheet.rows.len = y + 1;

        y++;

        return sheet;
      });

      event.on("close", () => {
        resolve(sheet);
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 *
 * @param object
 * @param fileStream
 * @param options
 */
export function objectToCSV<
  T extends { write: (data: string) => void; end: () => void },
>(object: FilledSheetData, fileStream: T, options?: CSVOptions) {
  const { delimiter = "," } = options ?? {};

  let headeColumn = 0;
  const rows = Object.values(object.rows);
  rows.forEach((row, y) => {
    let rowData = "";

    if (typeof row !== "number" && "cells" in row) {
      const largest = Object.keys(row.cells).reduce(
        (big, x) => (big < Number(x) ? Number(x) : big),
        0
      );
      if (y === 0) {
        // headers
        headeColumn = largest;
      }

      if (largest === 0) {
        rowData = ",".repeat(headeColumn);
      }

      for (let u = 0; u < largest + 1; u++) {
        const text = row.cells[u]?.text;

        switch (true) {
          case text?.includes(delimiter) ||
            text?.includes("\n") ||
            text?.includes(singleQuoteToken):
            // quoted cell
            rowData +=
              singleQuoteValue +
              text?.replaceAll(singleQuoteValue, doubleQuoteValue) +
              singleQuoteValue;
            break;

          case text !== undefined:
            // unquoted cell
            rowData += text;
            break;

          default:
            break;
        }

        if (u !== largest) {
          rowData += ",";
        }
      }

      // repeat , on empty cells
      if (rowData !== "" && largest < headeColumn) {
        rowData += ",".repeat(headeColumn - largest);
      }

      fileStream.write(rowData + lineEndToken);
    }
  });

  fileStream.end();
}

function lineParser(line: string, delimiter: string) {
  let chunk = "";
  let insideStr = false;
  let acc = {};
  let x = 0;

  /** Replace all double quotes */
  const modifiedLine: string = line.replaceAll(
    doubleQuoteValue,
    doubleQuoteToken
  );

  modifiedLine.split("").forEach((token, i) => {
    switch (true) {
      case token === delimiter && !insideStr:
        {
          if (chunk.length > 0) {
            acc = { ...acc, [x]: { text: chunk } };
            chunk = "";
          }
          x++;
        }
        break;

      case token === delimiter && insideStr:
        chunk += token;
        break;

      case token === singleQuoteToken:
        insideStr = !insideStr;
        break;

      case token === doubleQuoteToken:
        chunk += singleQuoteValue;
        break;

      default:
        chunk += token;
        break;
    }

    // add last chunk
    if (i === modifiedLine.length - 1 && chunk !== "") {
      acc = { ...acc, [x]: { text: chunk } };
    }
  });

  return { cells: acc };
}

// TODO: uncomment this (blame mocha)
/*
if(process.argv[1] === fileURLToPath(import.meta.url)){
  // running from cli

  if(!process.argv[2]){
    console.log("\nUsage:")
    console.log("parseCSV.ts example.csv\n")
    throw new Error("Missing input file")
  }
    const csvPath = path.normalize(process.cwd()+"/"+process.argv[2])
  
    const input = fs.createReadStream(csvPath, { encoding: "utf-8" });

    const lineReader = readline.createInterface({
      input,
      terminal: false,
    });

  csvToObject(lineReader, "").then(val=>{
    console.log("val = "+JSON.stringify(val, null,2))
  })
}
*/
