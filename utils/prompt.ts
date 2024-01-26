import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Writable } from "node:stream";

/**
 * Takes user input at the terminal
 */
export async function promptUser(prompt: string) {
  const mutableStdout = new Writable({
    write: function (chunk: Buffer, encoding, callback) {
      // console.log('\n+ '+chunk.length+" "+chunk.toString('hex')+chunk.toString())

      switch (true) {
        case chunk.toString("hex").startsWith("1b5b") &&
          !chunk.toString().includes(prompt):
          // escape chars
          break;

        case chunk.length === 1:
          // password char
          // output.write("\b")
          output.write("*");
          break;

        case chunk.toString("hex") === "0d0a":
          // line feed carrige return \r\n
          output.write("\n");
          break;

        case chunk.toString() === prompt:
          // final backspace char
          output.clearLine(-1);
          output.write(`\r${prompt}`);
          break;

        default: {
          // initial backspace
          const remaining = chunk.toString().replace(prompt, "");
          output.clearLine(-1);
          output.write(`\r${prompt}${"*".repeat(remaining.length)}`);
          break;
        }
      }
      callback();
    },
  });

  const rl = readline.createInterface({
    input,
    output: mutableStdout,
    terminal: true,
  });

  const pw = await rl.question(prompt);
  mutableStdout.destroy();

  return pw;
}
