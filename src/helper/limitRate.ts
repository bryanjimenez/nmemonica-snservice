import type { Request } from "express";
import rateLimit from "express-rate-limit";
import chalk from "chalk";

/**
 * Sets a max request limit per window for all requests
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 1000 * 60,
  limit: 300,
  message: (req: Request, _res: Response) => {
    console.log(`${chalk.red("Exceeded request rate limit")} ${req.ip}`);
    return "Exceeded request limit";
  },
});
