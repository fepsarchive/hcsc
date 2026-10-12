import "server-only";

import { request as httpsRequest, type RequestOptions } from "node:https";
import type { ClientRequest, IncomingMessage } from "node:http";
import { resolveSafeOutboundTarget, type OutboundResolver } from "./outbound-url-policy";

export type OutboundRequestOptions = RequestOptions & { autoSelectFamily: false };
export type OutboundRequest = (options: OutboundRequestOptions, response: (message: IncomingMessage) => void) => ClientRequest;
type TransportOptions = {
  resolve?: OutboundResolver;
  request?: OutboundRequest;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;

export async function postSafeWebhook(url: string, body: string, headers: Record<string, string>, options: TransportOptions = {}) {
  if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) throw new Error("Webhook request exceeds size limit.");
  const deadline = Date.now() + (options.timeoutMs ?? 5_000);
  const target = await resolveSafeOutboundTarget(url, {
    env: options.env, resolve: options.resolve, timeoutMs: Math.min(2_000, options.timeoutMs ?? 5_000),
  });
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Webhook deadline exceeded.");
  return new Promise<{ status: number; ok: boolean }>((resolve, reject) => {
    let response: IncomingMessage | undefined;
    let settled = false;
    const finish = (error?: Error, status?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(new Error("Webhook transport failed."));
        response?.destroy();
        req.destroy();
      } else resolve({ status: status!, ok: status! >= 200 && status! < 300 });
    };
    const request: OutboundRequest = options.request ?? httpsRequest;
    const req = request({
      protocol: "https:", hostname: target.url.hostname, port: 443,
      path: `${target.url.pathname}${target.url.search}`, method: "POST",
      // Keep the original hostname for certificate verification, SNI and Host.
      servername: target.url.hostname, rejectUnauthorized: true,
      agent: false, family: target.family, autoSelectFamily: false,
      // No second DNS resolution between validation and socket connection.
      lookup: (_hostname, _lookupOptions, callback) => callback(null, target.address, target.family),
      headers: { ...headers, Host: target.url.host, "Content-Length": Buffer.byteLength(body), Connection: "close" },
    }, (incoming) => {
      response = incoming;
      let received = 0;
      incoming.on("error", () => finish(new Error("Response stream failed.")));
      incoming.on("aborted", () => finish(new Error("Response aborted.")));
      incoming.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_RESPONSE_BYTES) finish(new Error("Response exceeds size limit."));
      });
      incoming.on("end", () => finish(undefined, incoming.statusCode ?? 502));
      // Node HTTPS never follows redirects. A 3xx is a rejected delivery.
      if (Number(incoming.headers["content-length"]) > MAX_RESPONSE_BYTES) finish(new Error("Response exceeds size limit."));
    });
    req.on("error", () => finish(new Error("Request failed.")));
    const timer = setTimeout(() => finish(new Error("Webhook deadline exceeded.")), remaining);
    req.end(body);
  });
}
