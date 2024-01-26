import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { csvToObject, objectToCSV } from "../helper/csvHelper.js";
import { multipart } from "../helper/multipart.js";
import { type SheetData } from "@nmemonica/x-spreadsheet";
import { updateDataAndCache } from "./data.js";
import { FilledSheetData, isFilledSheetData } from "../helper/sheetHelper.js";
import { sheetDataToJSON } from "../helper/jsonHelper.js";
import { config } from "../../utils/config.js";
import chalk from "chalk";

/**
 * @swagger
 * components:
 *  schemas:
 *    xspreadsheet:
 *      type: object
 *      properties:
 *        name:
 *          type: string
 *          description: name of sheet
 *          examples:
 *            Phrases
 *            Vocabulary
 *            Kanji
 *        cols:
 *          description: column properties
 *          type: object
 *        rows:
 *          description: row and cell data
 *          type: object
 *        merges:
 *          type: object
 *        styles:
 *          description: cell style information
 *          type: object
 *        freeze:
 *          type: object
 */

const _XLSX_FILE = "Nmemonica.xlsx";

const fileType: string = ".csv"; //".xlsx";
const sheetNames = ["Phrases", "Vocabulary", "Kanji"];

/**
 * @swagger
 * /workbook:
 *    get:
 *      description: get workbook object
 *      responses:
 *        200:
 *          description: an xspreadsheet object
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/xspreadsheet'
 */
export function getWorkbook(req: Request, res: Response, next: NextFunction) {
  let xObj: Promise<FilledSheetData>[];
  switch (fileType) {
    case ".xlsx": {
      throw new Error("Incomplete: hardcoded range in readXLSX");
    }
    default: /** CSV */ {
      xObj = sheetNames.reduce<Promise<FilledSheetData>[]>((acc, sheet) => {
        const filePath = path.normalize(`${config.directory.csv}/${sheet}.csv`);
        if (!fs.existsSync(filePath)) {
          console.log(chalk.red("No datasets"));
          console.log(
            `${chalk.yellow("Add datasets")} to: ${
              "." +
              config.directory.csv.replace(config.directory.root, "") +
              "/" +
              chalk.bold(sheet + ".csv")
            }`
          );

          return acc;
        }

        const input = fs.createReadStream(filePath, { encoding: "utf-8" });
        input.on("error", (err) => {
          console.log(`${chalk.red("Read failed")} for ${sheet}.csv`);
          next(err);
        });

        const lineReader = readline.createInterface({
          input,
          terminal: false,
        });

        return [...acc, csvToObject(lineReader, sheet)];
      }, []);
    }
  }

  Promise.all(xObj)
    .then((vals) => {
      if (vals.length === 0) {
        throw new Error("No datasets");
      }
      res.status(200).json(vals);
    })
    .catch(next);
}

/**
 * @swagger
 * /workbook:
 *    put:
 *      description: save a workbook object multipart object ...
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              $ref: '#/components/schemas/xspreadsheet'
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  hash:
 *                    type: string
 */
export async function putWorkbookAsync(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sheetData } = await multipart<SheetData>(req, next);
    if (!isFilledSheetData(sheetData)) {
      next(new Error("Sheet missing name or data"));
      return;
    }

    let h;
    switch (fileType) {
      case ".xlsx": {
        throw new Error("Incomplete: will override other sheets in wb!");
      }
      default:
        /** CSV */ {
          const t = new Date().toJSON();

          const backup = path.normalize(
            `${config.directory.csv}/backup/CSV-${t}`
          );
          // backup files
          if (!fs.existsSync(backup)) {
            fs.mkdirSync(backup, { recursive: true });
          }

          const { data, hash } = sheetDataToJSON(sheetData);

          const backupStream = fs.createWriteStream(
            `${backup}/${sheetData.name}.csv`
          );
          backupStream.on("error", (err) => {
            console.log(
              `${chalk.red("Backup failed")} for ${sheetData.name}.csv`
            );
            next(err);
          });

          objectToCSV(sheetData, backupStream);

          const mainFileStream = fs.createWriteStream(
            path.normalize(`${config.directory.csv}/${sheetData.name}.csv`)
          );
          mainFileStream.on("error", (err) => {
            console.log(
              `${chalk.red("Write failed")} for ${sheetData.name}.csv`
            );
            next(err);
          });

          // working files
          objectToCSV(sheetData, mainFileStream);
          const resourceName = sheetData.name.toLowerCase();
          const updateP = updateDataAndCache(resourceName, data, hash);

          updateP.catch(next);
          h = hash;
        }

        res.status(200).json({ hash: h });
    }
  } catch (e) {
    next(e);
  }
}
