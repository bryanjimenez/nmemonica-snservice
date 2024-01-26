import fs from "node:fs";
import startService from "./src/app.js";
import type { JsonObject } from "swagger-ui-express";
import chalk from "chalk";

const cli = Object.freeze({
  // commands
  // SOME_CMD: { cmd: ["--acommand", "-a"], desc: "Display command information" },

  // options
  PERMISSION_R_IGNORE: {
    opt: ["--no-permission-request"],
    desc: "Don't request read/write permissions when starting service",
  },
});

function showUsage(name: string, version: string) {
  console.log(`\n${name} ${version}`);
  const tab = 10;

  console.log(`\nUsage:`);
  const node = "node ./node_modules";
  console.log(`${" ".repeat(tab - 5)}${node}/${name} [command] [option]`);

  console.log(`\nExample:`);
  const serviceEx = `${name}`;
  console.log(
    `${" ".repeat(tab - 5)}${node}/${serviceEx}${" ".repeat(
      30 - serviceEx.length
    )} start service`
  );

  const clientEx = `${name} -u`;
  console.log(
    `${" ".repeat(tab - 5)}${node}/${clientEx}${" ".repeat(
      30 - clientEx.length
    )} create user certs`
  );

  const hostEx = `${name} -h`;
  console.log(
    `${" ".repeat(tab - 5)}${node}/${hostEx}${" ".repeat(
      30 - hostEx.length
    )} display hostname and ip`
  );

  console.log("\nCommands:");
  Object.values(cli).forEach((commands) => {
    if ("cmd" in commands && Array.isArray(commands.cmd)) {
      const cmd = commands.cmd.join("\n" + " ".repeat(tab - 5));
      console.log(
        `${" ".repeat(tab - 5)}${chalk.bold(cmd)}\n${" ".repeat(tab)}${
          commands.desc
        }`
      );
    }
  });

  console.log("\nOptions:");
  Object.values(cli).forEach((options) => {
    if ("opt" in options) {
      const opt = options.opt.join("\n" + " ".repeat(tab - 5));
      console.log(
        `${" ".repeat(tab - 5)}${chalk.bold(opt)}\n${" ".repeat(tab)}${
          options.desc
        }`
      );
    }
  });
}

function getPkgRoot() {
  let pkgRoot;
  switch (true) {
    case process.argv[1].endsWith("/dist/"):
      pkgRoot = process.argv[1].replace("/dist/", "");
      break;
    case process.argv[1].endsWith("/dist"):
      pkgRoot = process.argv[1].replace("/dist", "");
      break;
    case process.argv[1].endsWith("/dist/index.js"):
      pkgRoot = process.argv[1].replace("/dist/index.js", "");
      break;
    case process.argv[1].endsWith("@nmemonica/snservice"):
      pkgRoot = process.argv[1];
      break;
    default:
      throw new Error("Unexpected cwd");
  }

  return pkgRoot;
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file://${process.argv[1]}/dist/index.js` ||
  import.meta.url === `file://${process.argv[1]}index.js` ||
  import.meta.url === `file://${process.argv[1]}/index.js`
) {
  // running from cli

  switch (process.argv[2]) {
    case cli.PERMISSION_R_IGNORE.opt[0]:
    case undefined:
      {
        const swaggerSpec = JSON.parse(
          fs.readFileSync(getPkgRoot() + "/api-docs/swaggerSpec.json", {
            encoding: "utf-8",
          })
        ) as JsonObject;

        const permission = process.argv[2] !== cli.PERMISSION_R_IGNORE.opt[0];

        void startService({ swaggerSpec, permission });
      }
      break;

    default:
      {
        console.log(`\nUnknown flag '${process.argv[2]}'`);

        const { name, version } = JSON.parse(
          fs.readFileSync(getPkgRoot() + "/package.json", {
            encoding: "utf-8",
          })
        ) as { name: string; version: string };

        showUsage(name, version);
      }
      break;
  }
}
