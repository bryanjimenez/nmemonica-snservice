import multiparty from "multiparty";
import type { Request, NextFunction } from "express";

/**
 * Get sheet data from multipart request
 * @param req
 * @param next
 * @returns
 */
export function multipart<T>(req: Request, next: NextFunction) {
  // create a form to begin parsing
  const form = new multiparty.Form();
  const transfer = { size: 0, data: [] as Blob[] };

  let sheetName: string;
  form.on("error", next);

  // listen on field event for title
  form.on("field", function (name: string, val: string) {
    if (name !== "sheetName") return;
    sheetName = val;
  });

  // listen on part event for image file
  form.on("part", function (part) {
    // https://www.npmjs.com/package/multiparty

    if (!part.filename) return part.resume(); // a field
    if (part.name !== "sheetData") return part.resume(); // not our file

    part.on("data", function (chunk: Blob & { length: number }) {
      transfer.size += chunk.length;
      transfer.data.push(chunk);
    });
  });

  const data = new Promise<{ sheetName: string; sheetData: T }>(
    (resolve, _reject) => {
      form.on("close", function () {
        const d = new Blob(transfer.data, { type: "application/json" })
          .text()
          .then((jsonStr) => {
            const sheetData = JSON.parse(jsonStr) as T;

            return { sheetName, sheetData };
          });

        resolve(d);
      });
    }
  );

  // parse the form
  form.parse(req);

  return data;
}
