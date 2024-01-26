import type { Request, Response, NextFunction } from "express";
import { type SheetData } from "@nmemonica/x-spreadsheet";
import readline from "node:readline";
import { sheetDataToJSON } from "../helper/jsonHelper.js";
import { multipart } from "../helper/multipart.js";
import fs, { createWriteStream, createReadStream } from "node:fs";
import path from "node:path";
import { isFilledSheetData } from "../helper/sheetHelper.js";
import { config } from "../../utils/config.js";
import { csvToObject } from "../helper/csvHelper.js";
import chalk from "chalk";

const allowedResources = <const>["cache", "phrases", "vocabulary", "kanji"];
type AllowedResource = (typeof allowedResources)[number];
function isAllowedResource(str: string): str is AllowedResource {
  return allowedResources.find((a) => a === str) !== undefined;
}

function properCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * @swagger
 * components:
 *  schemas:
 *    Vocabulary:
 *      type: object
 *      properties:
 *        japanese:
 *          type: string
 *          description: Japanese definition
 *          example: にんげん\n人間
 *        english:
 *          type: string
 *          description: English definition
 *          example: human
 *        romaji:
 *          type: string
 *          description: romaji pronunciation
 *          example: ningen
 *        grp:
 *          type: string
 *          description: main group
 *          example: Noun
 *        subGrp:
 *          type: string
 *          description: sub group
 *          example: People
 */

/**
 * @swagger
 * /lambda/{data}.json:
 *    get:
 *      description: get dataset description here
 *      parameters:
 *      - in: path
 *        name: data
 *        required: true
 *        description: dataset resource requested
 *        schema:
 *          type: string
 *        example:
 *          vocabulary
 *      responses:
 *        200:
 *          description: Vocabulary.json
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  6f48c35203f9078a46baf913e5b8824e:
 *                    type: object
 *                    $ref: '#/components/schemas/Vocabulary'
 */
export function getData(req: Request, res: Response, next: NextFunction) {
  const { data } = req.params;
  const r = data?.toString().toLowerCase();

  // invalid resource
  if (!isAllowedResource(r)) {
    res.sendStatus(400);
    return;
  }
  const resource: AllowedResource = r;

  if (!fs.existsSync(config.directory.csv)) {
    fs.mkdirSync(config.directory.csv, { recursive: true });
  }

  //  GET cache.json
  //        no cache.json
  //  0:      no data.csv         -> 500
  //  1:      some.csv  -> build  -> 200

  //  GET data.json
  //        no data.json
  //  2:      no data.csv         -> 500
  //  3:      data.csv  -> build  -> 200

  //  4: json available

  // 0: no data + no cache.json
  if (
    resource === "cache" &&
    !allowedResources
      .filter((r) => r !== "cache")
      .some((r) =>
        fs.existsSync(`${config.directory.csv}/${properCase(r)}.csv`)
      )
  ) {
    console.log(
      `${chalk.yellow("Add datasets")} to: ${chalk.bold(
        "." + config.directory.csv.replace(config.directory.root, "") + "/"
      )}`
    );
    next(new Error("No datasets"));
    return;
  }

  // 2: no data
  if (
    resource !== "cache" &&
    !fs.existsSync(
      path.normalize(`${config.directory.csv}/${properCase(resource)}.csv`)
    ) &&
    !fs.existsSync(path.normalize(`${config.directory.json}/${resource}.json`))
  ) {
    console.log(
      `${chalk.yellow("Add dataset")} to: ${
        "." +
        config.directory.csv.replace(config.directory.root, "") +
        "/" +
        chalk.bold(properCase(resource) + ".csv")
      }`
    );

    next(new Error("No datasets"));
    return;
  }

  if (!fs.existsSync(config.directory.json)) {
    fs.mkdirSync(config.directory.json, { recursive: true });
  }

  res.set({ "Content-Type": "application/json; charset=utf-8" });

  // 1: Build cache.json
  if (
    resource === "cache" &&
    allowedResources
      .filter((r) => r !== "cache")
      .some((r) =>
        fs.existsSync(`${config.directory.csv}/${properCase(r)}.csv`)
      )
  ) {
    const bltResourcesP = allowedResources
      .filter(
        (r) =>
          r !== "cache" &&
          fs.existsSync(
            path.normalize(`${config.directory.csv}/${properCase(r)}.csv`)
          )
      )
      .map((r) => {
        const sheetName = properCase(r);
        const filePath = path.normalize(
          `${config.directory.csv}/${sheetName}.csv`
        );
        const input = fs.createReadStream(filePath, { encoding: "utf-8" });
        input.on("error", (err) => {
          console.log(`${chalk.red("CSV > JSON failed")} for ${sheetName}.csv`);
          next(err);
        });
        const lineReader = readline.createInterface({
          input,
          terminal: false,
        });

        return csvToObject(lineReader, sheetName).then((sheetData) => {
          const { data, hash } = sheetDataToJSON(sheetData);
          // const hashP = updateLocalCache(resource, hash);
          return updateData(r, data).then(() => ({ [r]: hash }));
        });
      });

    void Promise.all(bltResourcesP)
      .then((hashes) => {
        const cache = hashes.reduce((acc, el) => {
          return { ...acc, ...el };
        }, {});

        const file = fs.createWriteStream(
          path.normalize(`${config.directory.json}/cache.json`),
          { encoding: "utf-8" }
        );
        file.on("error", (err) => {
          console.log(`${chalk.red("Create failed")} for cache.json`);
          next(err);
        });
        file.on("finish", () => {
          res.json(cache);
        });
        file.end(JSON.stringify(cache, null, 2));
      })
      .catch(next);

    return;
  }

  // 3 Build data.json
  if (
    resource !== "cache" &&
    !fs.existsSync(path.normalize(`${config.directory.json}/${resource}.json`))
  ) {
    const sheetName = properCase(resource);

    const filePath = path.normalize(`${config.directory.csv}/${sheetName}.csv`);
    const input = fs.createReadStream(filePath, { encoding: "utf-8" });
    input.on("error", (err) => {
      console.log(`${chalk.red("CSV > JSON failed")} for ${sheetName}.csv`);
      next(err);
    });
    const lineReader = readline.createInterface({
      input,
      terminal: false,
    });

    void csvToObject(lineReader, sheetName).then((sheetData) => {
      const { data, hash } = sheetDataToJSON(sheetData);

      const fileP = updateData(resource, data);
      const hashP = updateLocalCache(resource, hash);

      Promise.all([fileP, hashP])
        .then(() => res.json(data))
        .catch(next);
    });

    return;
  }

  // 4: data.json available
  const readStream = createReadStream(
    path.normalize(`${config.directory.json}/${resource}.json`)
  );
  readStream.on("error", (err) => {
    console.log(`${chalk.red("Read failed")} for ${resource}.json`);
    next(err);
  });
  readStream.pipe(res);
}

/**
 * Update JSON (vocabulary) resource
 */
export async function putData(req: Request, res: Response, next: NextFunction) {
  const { sheetData } = await multipart<SheetData>(req, next);

  if (!isFilledSheetData(sheetData)) {
    next(new Error("Sheet missing name or data"));
    return;
  }

  const resource = sheetData.name.toLowerCase();

  if (resource !== "cache" && !isAllowedResource(resource)) {
    res.sendStatus(400);
  }

  if (!fs.existsSync(config.directory.json)) {
    fs.mkdirSync(config.directory.json, { recursive: true });
  }

  const { data, hash } = sheetDataToJSON(sheetData);

  const fileP = updateData(resource, data);
  const hashP = updateLocalCache(resource, hash);

  Promise.all([fileP, hashP])
    .then(() => res.sendStatus(200))
    .catch(next);
}

/**
 * Combined operation of
 *
 * - Write data to json file
 * - Update cache json file
 * @param resource name of data set
 * @param data value
 * @param hash
 */
export function updateDataAndCache(
  resource: string,
  data: Record<string, unknown>,
  hash: string
) {
  if (resource !== "cache" && !isAllowedResource(resource)) {
    // res.sendStatus(400);
    //
    throw new Error("invalid resource");
  }

  const fileP = updateData(resource, data);
  const hashP = updateLocalCache(resource, hash);

  return Promise.all([fileP, hashP]).then(() => {});
}

/**
 * Write JSON formatted data to file
 * @param jsonData
 * @param resourceName
 */
function updateData(resourceName: string, jsonData: Record<string, unknown>) {
  const dataPath = path.normalize(
    `${config.directory.json}/${resourceName}.json`
  );

  return new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(dataPath, { encoding: "utf-8" });
    writeStream.on("error", (err) => {
      console.log(`${chalk.red("Update failed")} on ${resourceName}.json`);
      reject(err);
    });
    writeStream.end(JSON.stringify(jsonData, null, 2));
    resolve();
  });
}

/**
 * Update cache file hashes
 * @param resource to update
 * @param hash value
 */
function updateLocalCache(resource: string, hash: string) {
  const cachePath = path.normalize(`${config.directory.json}/cache.json`);

  return fs.promises
    .readFile(cachePath, { encoding: "utf-8" })
    .then((body) => JSON.parse(body) as Record<string, string>)
    .then((value) => {
      value[resource] = hash;
      return value;
    })
    .then((json) => JSON.stringify(json, null, 2))
    .then((value) => fs.promises.writeFile(cachePath, value))
    .catch((error: Error) => {
      if ("name" in error && error.name === "NotFound") {
        void fs.promises.writeFile(
          cachePath,
          JSON.stringify({ [resource]: hash }, null, 2)
        );
      } else {
        console.log(`${chalk.red("Update failed")} for cache.json ${resource}`);

        throw error;
      }
    });
}
