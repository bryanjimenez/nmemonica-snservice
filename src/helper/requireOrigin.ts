import type { Request, Response, NextFunction } from "express";
import { allowedOrigins, serviceIP } from "../app.js";
import { config } from "../../utils/config.js";
import chalk from "chalk";

/**
 * Check origin
 */
export function requireAllowOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.set({ "Access-Control-Allow-Credentials": true });

  // No Origin Exceptions
  if (
    req.secure &&
    req.method === "GET" &&
    // no origin checks for swagger-ui /api-docs
    (req.url.startsWith("/api-docs") ||
      req.url.startsWith("/api-docs/") ||
      req.headers?.referer ===
        `https://${serviceIP}:${config.service.port}/api-docs/`)
  ) {
    console.log(`${chalk.yellow("Without Origin")} ${req.url}`);
    next();
    return;
  }

  if (req.secure) {
    if (req.method === "OPTIONS") {
      const allowed =
        req.headers.origin && allowedOrigins.includes(req.headers.origin)
          ? req.headers.origin
          : allowedOrigins[0];

      res.set("Access-Control-Allow-Origin", allowed);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Methods", "GET, PUT");
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Cache-Control, Data-Version"
      );

      res.sendStatus(204);
      return;
    }

    if (!req.headers.origin || !allowedOrigins.includes(req.headers.origin)) {
      res.sendStatus(401);
      if (!req.headers.origin) {
        console.log(chalk.red("Missing Origin"));
        return;
      }
      if (!allowedOrigins.includes(req.headers.origin)) {
        console.log(chalk.red("Unknown Origin ") + req.headers.origin);
        return;
      }
    }

    res.set("Access-Control-Allow-Origin", req.headers.origin);
  }
  next();
}
