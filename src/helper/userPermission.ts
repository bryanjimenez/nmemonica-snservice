import fs from "node:fs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../../utils/config.js";

/**
 * Request user permission for required files/access
 * @param serviceIP LAN IP
 * @param httpsPort
 */
export async function requestUserPermission(
  serviceIP: string,
  httpsPort: number
) {
  const rl = readline.createInterface({ input, output });
  const writeJSONGranted = await rl.question(
    `Grant WRITE access? "${config.directory.json.replace(
      config.directory.root,
      ""
    )}" [y/n]\t`
  );
  const writeCSVGranted = await rl.question(
    `Grant WRITE access? "${config.directory.csv.replace(
      config.directory.root,
      ""
    )}" [y/n]\t`
  );
  const writeAudioGranted = await rl.question(
    `Grant WRITE access? "${config.directory.audio.replace(
      config.directory.root,
      ""
    )}" [y/n]\t`
  );
  const writeKeyGranted = await rl.question(
    `Grant WRITE access? "${config.directory.ca.replace(
      config.directory.root,
      ""
    )}" [y/n]\t`
  );

  const httpsGranted = await rl.question(
    `Grant HTTPS access? "${serviceIP}:${httpsPort}" [y/n]\t`
  );
  isAllowed(httpsGranted, `${serviceIP}:${httpsPort}`, "Denied HTTPS access");

  isAllowed(
    writeJSONGranted,
    config.directory.json.replace(config.directory.root, ""),
    "Denied WRITE access"
  );
  isAllowed(
    writeCSVGranted,
    config.directory.csv.replace(config.directory.root, ""),
    "Denied WRITE access"
  );
  isAllowed(
    writeAudioGranted,
    config.directory.audio.replace(config.directory.root, ""),
    "Denied WRITE access"
  );
  isAllowed(
    writeKeyGranted,
    config.directory.ca.replace(config.directory.root, ""),
    "Denied WRITE access"
  );

  if (!fs.existsSync(config.directory.csv)) {
    const createIt = await rl.question(
      `Create directory? "${config.directory.csv.replace(
        config.directory.root,
        ""
      )}" [y/n]\t`
    );
    if (
      isAllowed(
        createIt,
        "Missing required directory ",
        config.directory.csv.replace(config.directory.root, "")
      )
    ) {
      fs.mkdirSync(config.directory.csv, { recursive: true });
    }
  }
  if (!fs.existsSync(config.directory.json)) {
    const createIt = await rl.question(
      `Create directory? "${config.directory.json.replace(
        config.directory.root,
        ""
      )}" [y/n]\t`
    );
    if (
      isAllowed(
        createIt,
        "Missing required directory",
        config.directory.json.replace(config.directory.root, "")
      )
    ) {
      fs.mkdirSync(config.directory.json, { recursive: true });
    }
  }
  if (!fs.existsSync(config.directory.audio)) {
    const createIt = await rl.question(
      `Create directory? "${config.directory.audio.replace(
        config.directory.root,
        ""
      )}" [y/n]\t`
    );
    if (
      isAllowed(
        createIt,
        "Missing required directory",
        config.directory.audio.replace(config.directory.root, "")
      )
    ) {
      fs.mkdirSync(config.directory.audio, { recursive: true });
    }
  }
}

function isAllowed(response: string, path?: string, msg?: string) {
  const allowed = response?.toLowerCase() === "y";
  if (!allowed && path !== undefined && msg !== undefined) {
    throw new Error(`${msg} "${path}"`);
  }

  return allowed;
}
