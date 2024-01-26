import assert from "node:assert";
import EventEmitter from "node:events";
import {
  CSVOptions,
  csvToObject,
  objectToCSV,
} from "../../../src/helper/csvHelper";
import { type FilledSheetData } from "../../../src/helper/sheetHelper";

/**
 * **Simulate** fs readline
 * @param sheetName name of the simulated CSV file
 * @param csvString each entry in the array represents a row
 */
function csvStrArrToSheetData(sheetName: string, csvString: string[]) {
  const lineReaderSimulator = new EventEmitter();

  const objP = csvToObject(lineReaderSimulator, sheetName);
  csvString.forEach((line) => {
    lineReaderSimulator.emit("line", line);
  });

  lineReaderSimulator.emit("close");

  return objP;
}

/**
 * **Simulate** fs file write
 * @param sheetData `FilledSheetData` object
 * @param options
 * @returns a string[] each entry in the array represents a row
 */
export function sheetDataToCsvStrArr(
  sheetData: FilledSheetData,
  options?: CSVOptions
) {
  const fileSim = new EventEmitter();

  const fileWriterSimulator = {
    write: (line: string) => {
      fileSim.emit("write", line);
    },
    end: () => {},
  };

  let acc: string[] = [];
  fileSim.on("write", (line) => {
    const lineEnding = !line.includes("\r\n") ? "\n" : "\r\n";
    const l = line.replace(lineEnding, "");

    const cellNewLine = "\n";
    if (l.includes(cellNewLine)) {
      acc = [...acc, ...l.split(cellNewLine)];
    }
  });

  objectToCSV(sheetData, fileWriterSimulator, options);

  return acc;
}

describe("csvHelper", function () {
  describe("csvToObject", function () {
    const exampleData = [`this,is,my`, `CSV,だいようぶ？,`, `,,`, `test,,test`];

    it("correct row count", function () {
      return csvStrArrToSheetData("", exampleData).then((sheet) => {
        assert.equal(sheet.rows.len, 4);
      });
    });

    it("skips empty rows", function () {
      return csvStrArrToSheetData("", exampleData).then((sheet) => {
        assert.deepStrictEqual(sheet.rows[0], {
          cells: {
            "0": { text: "this" },
            "1": { text: "is" },
            "2": { text: "my" },
          },
        });
        assert.deepStrictEqual(sheet.rows[1], {
          cells: { "0": { text: "CSV" }, "1": { text: "だいようぶ？" } },
        });

        assert.deepStrictEqual(sheet.rows[2], { cells: {} });
        assert.deepStrictEqual(sheet.rows[3], {
          cells: { "0": { text: "test" }, "2": { text: "test" } },
        });
      });
    });

    it("cell w/ newline", function () {
      const multilineTest = [`"the multiline`, `test",,testing`];
      return csvStrArrToSheetData("", multilineTest).then((sheet) => {
        assert.deepStrictEqual(sheet.rows[0], {
          cells: {
            "0": { text: "the multiline\ntest" },
            "2": { text: "testing" },
          },
        });
      });
    });

    it("row w/ multiple cell w/ newline", function () {
      const fileMock = [
        `"どうやってしるの`,
        `どうやって知るの",dou yatte shiru no,How will you know?,,,,"Exception:`,
        `知る used as if future tense`,
        `to know something not currently known",,,,,,`,
        `"にほんごがはなせるようになりたい`,
        `日本語が話せるようになりたい",nihongo ga hanaseru yō ni naritai,I want to be able to speak Japanese,,Desire,verb + yō ni naru,,,,,,,`,
      ];
      return csvStrArrToSheetData("", fileMock).then((sheet) => {
        assert.deepStrictEqual(sheet.rows[0], {
          cells: {
            "0": { text: "どうやってしるの\nどうやって知るの" },
            "1": { text: "dou yatte shiru no" },
            "2": { text: "How will you know?" },
            "6": {
              text: "Exception:\n知る used as if future tense\nto know something not currently known",
            },
          },
        });
      });
    });

    it("double quotes", function () {
      const fileMock = [
        `"アイツに「おそい」ってよばれた`,
        `アイツに「遅い」って呼ばれた",aitsu ni osoi tte yobareta,"That guy called me ""slow""",,Noun+Verb,,,"p:に`,
        `fragment`,
        `passive",,,,,`,
      ];
      const expected = {
        cells: {
          "0": {
            text: "アイツに「おそい」ってよばれた\nアイツに「遅い」って呼ばれた",
          },
          "1": { text: "aitsu ni osoi tte yobareta" },
          "2": { text: 'That guy called me "slow"' },
          "4": { text: "Noun+Verb" },
          "7": { text: "p:に\nfragment\npassive" },
        },
      };

      return csvStrArrToSheetData("", fileMock).then((sheet) => {
        assert.deepStrictEqual(sheet.rows[0], expected);
      });
    });

    it("double quotes 2", function () {
      const fileMock = [
        `"アイツに「おそい」ってよばれた`,
        `アイツに「遅い」って呼ばれた",aitsu ni osoi tte yobareta,"That guy called me ""slow""",,Noun+Verb,,,"p:に`,
        `fragment`,
        `passive"`,
      ];
      const actual = csvStrArrToSheetData("", fileMock);

      const expected = {
        cells: {
          "0": {
            text: "アイツに「おそい」ってよばれた\nアイツに「遅い」って呼ばれた",
          },
          "1": { text: "aitsu ni osoi tte yobareta" },
          "2": { text: 'That guy called me "slow"' },
          "4": { text: "Noun+Verb" },
          "7": { text: "p:に\nfragment\npassive" },
        },
      };

      return actual.then((sheet) => {
        assert.deepStrictEqual(sheet.rows[0], expected);
      });
    });

    it("delimiter inside string", function () {
      const fileMock = [`画,"brush-stroke, picture",,,,TV,,,,,,,,`];
      const expected = {
        cells: {
          "0": { text: "画" },
          "1": { text: "brush-stroke, picture" },
          "5": { text: "TV" },
        },
      };

      csvStrArrToSheetData("", fileMock).then((actual) => {
        assert.deepStrictEqual(actual, expected);
      });
    });
  });

  describe("objectToCsv", function () {
    it("quotations", function () {
      const obj = {
        name: "",
        rows: {
          "0": {
            cells: {
              "0": {
                text: "アイツに「おそい」ってよばれた\nアイツに「遅い」って呼ばれた",
              },
              "1": { text: "aitsu ni osoi tte yobareta" },
              "2": { text: 'That guy called me "slow"' },
              "4": { text: "Noun+Verb" },
              "7": { text: "p:に\nfragment\npassive" },
            },
          },
          len: 1,
        },
      };

      const expected = [
        `"アイツに「おそい」ってよばれた`,
        `アイツに「遅い」って呼ばれた",aitsu ni osoi tte yobareta,"That guy called me ""slow""",,Noun+Verb,,,"p:に`,
        `fragment`,
        `passive"`,
      ];

      const actual = sheetDataToCsvStrArr(obj);

      assert.deepStrictEqual(actual, expected);
    });
    it("to csv", function () {
      const obj = {
        name: "",
        rows: {
          "0": {
            cells: {
              "0": { text: "おつかれさまです\nお疲れ様です" },
              "1": { text: "o tsukare sama desu" },
              "2": {
                text: "I appreciate your efforts, thank you very much, good work",
              },
              "3": { text: "(Unfinished task) tired person" },
              "4": { text: "Social" },
            },
          },
          len: 1,
        },
      };

      const expected = [
        `"おつかれさまです`,
        `お疲れ様です",o tsukare sama desu,"I appreciate your efforts, thank you very much, good work",(Unfinished task) tired person,Social`,
      ];

      const actual = sheetDataToCsvStrArr(obj);

      assert.deepStrictEqual(actual, expected);
    });
  });
});
