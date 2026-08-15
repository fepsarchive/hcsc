import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function isPrivateIp(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const value = address.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value) || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

export async function assertSafeOutboundUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Outbound endpoint must use HTTPS.");
  if (url.username || url.password) throw new Error("Credentials are not allowed in endpoint URLs.");
  if (url.port && url.port !== "443") throw new Error("Only the standard HTTPS port is allowed.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "metadata.google.internal") {
    throw new Error("Local network endpoints are not allowed.");
  }

  const allowlist = (process.env.HCSC_OUTBOUND_ALLOWED_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`))) {
    throw new Error("Endpoint hostname is outside the configured allowlist.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) throw new Error("Private or reserved network endpoints are not allowed.");
  return url;
}
