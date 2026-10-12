import "server-only";

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Conservative subset of globally routable addresses, not merely RFC1918.
// IANA special-purpose ranges (including transition mechanisms) are excluded.
const deniedV4 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) deniedV4.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const deniedV6 = new BlockList();
for (const [address, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16],
  ["3fff::", 20], ["2620:4f:8000::", 48],
] as const) deniedV6.addSubnet(address, prefix, "ipv6");

export class OutboundPolicyError extends Error {
  constructor(message = "Dış bağlantı güvenlik politikası tarafından reddedildi.") {
    super(message);
    this.name = "OutboundPolicyError";
  }
}

export function isPublicOutboundAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !deniedV4.check(address, "ipv4");
  // IPv4-mapped, NAT64, link-local, ULA and multicast cannot enter this set.
  return family === 6 && !address.includes("%") && globalV6.check(address, "ipv6") && !deniedV6.check(address, "ipv6");
}

type Address = { address: string; family: number };
export type OutboundResolver = (hostname: string) => Promise<Address[]>;
type PolicyOptions = {
  env?: NodeJS.ProcessEnv;
  resolve?: OutboundResolver;
  timeoutMs?: number;
};

function parseOutboundUrl(value: string, env: NodeJS.ProcessEnv) {
  let url: URL;
  try { url = new URL(value); } catch { throw new OutboundPolicyError("Geçerli bir HTTPS adresi girin."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) {
    throw new OutboundPolicyError("Yalnızca kimlik bilgisi veya fragment içermeyen standart HTTPS adresleri kullanılabilir.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(hostname) || hostname.length > 253 || !hostname.includes(".") ||
    !hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    ["localhost", "local", "internal", "home.arpa"].some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
    throw new OutboundPolicyError("Dış bağlantı için genel bir DNS hostname kullanın; IP ve yerel adlar kabul edilmez.");
  }
  const allowlist = (env.HCSC_OUTBOUND_ALLOWED_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase().replace(/\.$/, "")).filter(Boolean);
  // Exact hosts only: approving example.com does not approve tenant.example.com.
  if ((!allowlist.length && env.NODE_ENV === "production") || (allowlist.length && !allowlist.includes(hostname))) {
    throw new OutboundPolicyError("Hostname HCSC_OUTBOUND_ALLOWED_HOSTS listesinde açıkça onaylanmalıdır.");
  }
  url.hostname = hostname;
  return url;
}

export async function resolveSafeOutboundTarget(value: string, options: PolicyOptions = {}) {
  const url = parseOutboundUrl(value, options.env ?? process.env);
  const resolve = options.resolve ?? ((hostname) => lookup(hostname, { all: true, verbatim: true }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let addresses: Address[];
  try {
    addresses = await Promise.race([
      resolve(url.hostname),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new OutboundPolicyError("DNS çözümleme süresi aşıldı.")), options.timeoutMs ?? 2_000);
      }),
    ]);
  } catch (error) {
    if (error instanceof OutboundPolicyError) throw error;
    // Resolver error strings can contain infrastructure details.
    throw new OutboundPolicyError("Dış bağlantı DNS doğrulaması başarısız.");
  } finally { clearTimeout(timer); }
  if (!addresses.length || addresses.some(({ address, family }) => isIP(address) !== family || !isPublicOutboundAddress(address))) {
    throw new OutboundPolicyError("Özel veya rezerve ağ adreslerine bağlantı engellendi.");
  }
  return { url, address: addresses[0].address, family: addresses[0].family as 4 | 6 };
}

export async function assertSafeOutboundUrl(value: string) {
  return (await resolveSafeOutboundTarget(value)).url;
}
