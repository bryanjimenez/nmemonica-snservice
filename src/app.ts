import fs from "node:fs";
import { sep } from "node:path";
import express from "express";
import https from "node:https";
import { getData } from "./routes/data.js";
import { getWorkbook, putWorkbookAsync } from "./routes/workbook.js";
import { getAudioAsync } from "./routes/audio.js";
import { requestUserPermission } from "./helper/userPermission.js";
import { custom404, customError, logAll } from "./helper/utilHandlers.js";
import { requireClientAuth } from "./helper/requireAuth.js";
import { requireAllowOrigin } from "./helper/requireOrigin.js";
import chalk from "chalk";
import { config } from "../utils/config.js";
import swaggerUI from "swagger-ui-express";
import { rateLimiter } from "./helper/limitRate.js";

const uiPort = config.ui.port;
const httpsPort = config.service.port;

export const serviceIP = config.service.address;

export const allowedOrigins = [
  `https://localhost:${uiPort}`,
  `https://127.0.0.1:${uiPort}`,
  `https://${serviceIP}:${uiPort}`,
  ...(config.service.hostname
    ? [
        `https://${config.service.hostname}:${uiPort}`,
        `https://${config.service.hostname}:${httpsPort}`,
      ]
    : [
        /** Don't add undefined */
      ]),
  `https://${serviceIP}:${httpsPort}`,
  ...(config.ui.origin
    ? [config.ui.origin]
    : [
        /** Don't add undefined */
      ]),
];

interface ServiceOptions {
  swaggerSpec?: swaggerUI.JsonObject;
  permission?: boolean;
}

export default async function runService(serviceOptions?: ServiceOptions) {
  const { swaggerSpec, permission } = serviceOptions ?? {};

  if (permission !== false) {
    await requestUserPermission(serviceIP, httpsPort);
  }

  const app = express();

  app.disable("x-powered-by");
  app.use(logAll);
  app.use(rateLimiter);

  app.use(express.json()); // for parsing application/json
  // app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

  app.use(requireAllowOrigin);
  // must follow preflight requireAllowOrigin
  app.use(requireClientAuth);

  if (swaggerSpec) {
    swaggerSpec.servers = [
      {
        url: `https://${serviceIP}:${httpsPort}`,
        description: "snservice",
      },
    ];
    app.use(
      "/api-docs",
      swaggerUI.serve,
      swaggerUI.setup(swaggerSpec, {
        // prevent 'try it out' on anything but GET
        swaggerOptions: { supportedSubmitMethods: ["get"] },
      })
    );
  }

  app.get(config.route.audio, getAudioAsync);

  // JSON
  app.get(config.route.data + "/:data.json", getData);

  // SHEETS
  app.get(config.route.sheet, getWorkbook);
  app.put(config.route.sheet, putWorkbookAsync);

  app.use(custom404);
  app.use(customError);

  const cwd = config.directory.ca;

  if (swaggerSpec) {
    console.log(`\n${chalk.green("Swagger")} API Docs`);
    console.log(`https://${serviceIP}:${httpsPort}/api-docs`);
  }

  const credentials = {
    key: fs.readFileSync(`${cwd}${sep}${config.ca.server.key}`, {
      encoding: "utf-8",
    }),
    cert: fs.readFileSync(`${cwd}${sep}${config.ca.server.crt}`, {
      encoding: "utf-8",
    }),
    dhparam: fs.readFileSync(`${cwd}${sep}${config.ca.dhParam.name}`, {
      encoding: "utf8",
    }),
  };

  const httpsServer = https.createServer(
    {
      ...credentials,

      requestCert: true,
      rejectUnauthorized: false, // OPTIONS do not have credentials ..
      ca: [
        fs.readFileSync(`${cwd}${sep}${config.ca.intermediate.chain}`, {
          encoding: "utf8",
        }),
      ],
    },
    app
  );
  httpsServer.listen(httpsPort, serviceIP, 0, () => {
    console.log("\nNmemonica Service");
    console.log(
      chalk.blue("https://") + serviceIP + chalk.blue(":" + httpsPort)
    );
    console.log("\n");
  });
}
