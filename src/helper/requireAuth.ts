import type { Request, Response, NextFunction } from "express";
import chalk from "chalk";

/**
 * Verify request has authorized client certificate
 */
export function requireClientAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // https://nodejs.org/api/http.html#requestsocket
  // https://nodejs.org/api/tls.html#tlssocketgetpeercertificatedetailed
  //@ts-expect-error getPeerCertificate in req.socket
  const cert = req.socket.getPeerCertificate();
  //@ts-expect-error authorized in req.socket
  const socketAuth: boolean = req.socket.authorized;
  // console.log("req.socket.authorized: "+socketAuth)
  //@ts-expect-error client in req.client.authorized
  const clientAuth: boolean = req.client.authorized;
  // console.log("req.client.authorized: "+clientAuth)
  // console.log('cert CN: '+cert?.subject?.CN)

  if (socketAuth && clientAuth && "subject" in cert) {
    next();
    return;
  }

  console.log(chalk.red("No Client Cert"));
  res.sendStatus(401);
  return;
}
