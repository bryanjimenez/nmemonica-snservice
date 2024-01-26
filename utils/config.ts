import fs from "node:fs";
import path from "node:path";

interface CrtParameters {
  key: string;
  crt: string;
  csr: string;
  cnf: string;
  bundle?: string;
  chain?: string;
}

interface ServiceConfiguration {
  ui: {
    origin: string;
    port: number;
  };
  service: {
    address: string;
    hostname: string;
    port: number;
  };

  ca: {
    root: CrtParameters;
    intermediate: CrtParameters;
    server: CrtParameters;
    client: CrtParameters & { bundle: string };
    dhParam: { bits: number; name: string };
  };

  directory: {
    root: string;
    ca: string;
    pushAPI: string;
    csv: string;
    json: string;
    audio: string;
  };

  route: {
    getCa: string;
    getClient: string;
    audio: string;
    data: string;
    sheet: string;
    pushGetPubKey: string;
    pushRegister: string;
    pushSheetData: string;
  };
}

const projectRoot = path.resolve();

function getConfig() {
  const configPath = "/snservice.conf.json";
  if (!fs.existsSync(projectRoot + configPath)) {
    console.log(projectRoot);
    throw new Error("Missing config file " + projectRoot);
  }
  const config = JSON.parse(
    fs.readFileSync(projectRoot + configPath, { encoding: "utf-8" })
  ) as ServiceConfiguration;

  if (config.ui.port === undefined) {
    throw new Error("Missing app ui port in config file");
  }

  if (config.service.address === undefined) {
    throw new Error("Missing service address in config file");
  }
  if (config.service.port === undefined) {
    throw new Error("Missing service https port in config file");
  }

  if (config.directory.ca === undefined) {
    throw new Error("Missing CA directory path in config file");
  }

  const root = {
    key: "root.key.pem",
    crt: "root.crt.pem",
    csr: "root.csr",
    cnf: "root.openssl.cnf",
  };
  const intermediate = {
    key: "intermediate.key.pem",
    crt: "intermediate.crt.pem",
    csr: "intermediate.csr",
    cnf: "intermediate.openssl.cnf",
    chain: "intermediate.chain.crt.pem",
  };
  const server = {
    key: "server.key.pem",
    crt: "server.crt.pem",
    csr: "server.csr",
    cnf: "server.openssl.cnf",
  };
  const client = {
    key: "client.key.pem",
    crt: "client.crt.pem",
    csr: "client.csr",
    cnf: "client.openssl.cnf",
    bundle: "client.bundle.pfx",
  };

  const dhParam = { bits: 2048, name: "dh-param.pem" };

  config.ca = { root, intermediate, server, client, dhParam };

  {
    // service routes/paths
    const getCa = "/getCA";
    const getClient = "/getClient";

    const audio = "/g_translate_pronounce";
    const data = "/lambda";
    const sheet = "/workbook";

    const pushGetPubKey = "/getPushPublicKey";
    const pushRegister = "/registerClient";
    const pushSheetData = "/pushSheetData";
    config.route = {
      getCa,
      getClient,
      audio,
      data,
      sheet,
      pushGetPubKey,
      pushRegister,
      pushSheetData,
    };
  }

  {
    // normalize paths
    const projectRoot = path.resolve();
    const ca = path.normalize(`${projectRoot}/${config.directory.ca}`);
    const pushAPI = path.normalize(
      `${projectRoot}/${config.directory.pushAPI}`
    );
    const csv = path.normalize(`${projectRoot}/${config.directory.csv}`);
    const json = path.normalize(`${projectRoot}/${config.directory.json}`);
    const audio = path.normalize(`${projectRoot}/${config.directory.audio}`);

    config.directory = { root: projectRoot, ca, pushAPI, csv, json, audio };
  }

  return config;
}

export const config = getConfig();
