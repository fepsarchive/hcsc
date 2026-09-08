import "server-only";

import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import type { ConnectedDomain } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { canActivateDomain, hasOwnershipRecord, normalizeDomain, type DomainChecks } from "@/lib/domain-policy";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/server/integrations/secret-crypto";

const resolver = new Resolver({ timeout: 2500, tries: 2 });

function publicDomain(domain: ConnectedDomain) {
  return {
    id: domain.id, hostname: domain.hostname, status: domain.status,
    verifiedAt: domain.verifiedAt, activatedAt: domain.activatedAt,
    lastCheckedAt: domain.lastCheckedAt, lastCheck: domain.lastCheck,
    providerConnected: Boolean(domain.zoneId && domain.tokenCiphertext),
    dnsRecord: { type: "TXT", name: `_hcsc-verification.${domain.hostname}`, value: `hcsc-verification=${domain.verificationToken}` },
  };
}

export async function listConnectedDomains(organizationId: string) {
  return (await prisma.connectedDomain.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 50 })).map(publicDomain);
}

export async function addConnectedDomain(organizationId: string, value: string) {
  const hostname = normalizeDomain(value);
  if (await prisma.connectedDomain.count({ where: { organizationId } }) >= 50) throw new Error("Çalışma alanı başına en fazla 50 domain eklenebilir.");
  const domain = await prisma.connectedDomain.upsert({
    where: { organizationId_hostname: { organizationId, hostname } },
    create: { organizationId, hostname, verificationToken: randomBytes(32).toString("hex") },
    update: {},
  });
  return publicDomain(domain);
}

async function ownedRecord(organizationId: string, id: string) {
  const domain = await prisma.connectedDomain.findFirst({ where: { id, organizationId } });
  if (!domain) throw new Error("Domain bulunamadı.");
  return domain;
}

async function verifyOwnership(domain: ConnectedDomain) {
  try {
    return hasOwnershipRecord(await resolver.resolveTxt(`_hcsc-verification.${domain.hostname}`), domain.verificationToken);
  } catch {
    return false;
  }
}

type Zone = { name: string; status: string; paused?: boolean };
type DnsRecord = { name: string; type: string; proxied?: boolean };
type ManagedRules = { rules?: Array<{ action?: string; enabled?: boolean; expression?: string; action_parameters?: { id?: string } }> };

async function cloudflare<T>(path: string, token: string, missing?: T): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    signal: AbortSignal.timeout(5000), redirect: "error",
  });
  if (response.status === 404 && missing !== undefined) return missing;
  const body = await response.json() as { success?: boolean; result?: T };
  if (!response.ok || body.success !== true || body.result === undefined) {
    throw new Error(`Cloudflare bağlantısı doğrulanamadı (HTTP ${response.status}). Token kapsamını ve zone yetkilerini kontrol et.`);
  }
  return body.result;
}

function matchesZone(hostname: string, zoneName: string) {
  return hostname === zoneName || hostname.endsWith(`.${zoneName}`);
}

export async function connectDomainProvider(organizationId: string, id: string, zoneId: string, token: string) {
  const domain = await ownedRecord(organizationId, id);
  if (!await verifyOwnership(domain)) throw new Error("Önce DNS TXT sahiplik kaydını doğrula.");
  const zone = await cloudflare<Zone>(`/zones/${zoneId}`, token);
  if (!matchesZone(domain.hostname, zone.name.toLowerCase())) throw new Error("Cloudflare zone bu domaine ait değil.");
  const result = await prisma.connectedDomain.update({ where: { id: domain.id }, data: {
    zoneId, tokenCiphertext: encryptIntegrationSecret(token), verifiedAt: new Date(),
    status: "provider_connected", activatedAt: null, lastCheck: { message: "Sağlayıcı bağlandı; koruma yapılandırmasını kontrol et." },
  } });
  return publicDomain(result);
}

export async function checkConnectedDomain(organizationId: string, id: string, activate = false) {
  const domain = await ownedRecord(organizationId, id);
  const ownership = await verifyOwnership(domain);
  const checks: DomainChecks = { ownership, zoneActive: false, hostnameProxied: false, strictTls: false, managedWafConfigured: false, checkedAt: new Date().toISOString(), message: "TXT sahiplik kaydı bulunamadı veya DNS yanıt vermedi." };
  if (ownership) {
    checks.message = "Sahiplik doğrulandı. Cloudflare bağlantısı ve koruma yapılandırması bekleniyor.";
    if (domain.zoneId && domain.tokenCiphertext) {
      try {
        const token = decryptIntegrationSecret(domain.tokenCiphertext);
        const base = `/zones/${domain.zoneId}`;
        const [zone, records, ssl, waf] = await Promise.all([
          cloudflare<Zone>(base, token),
          cloudflare<DnsRecord[]>(`${base}/dns_records?name=${encodeURIComponent(domain.hostname)}&per_page=100`, token),
          cloudflare<{ value?: string }>(`${base}/settings/ssl`, token),
          cloudflare<ManagedRules>(`${base}/rulesets/phases/http_request_firewall_managed/entrypoint`, token, {}),
        ]);
        checks.zoneActive = matchesZone(domain.hostname, zone.name.toLowerCase()) && zone.status === "active" && !zone.paused;
        const webRecords = records.filter((record) => record.name === domain.hostname && ["A", "AAAA", "CNAME"].includes(record.type));
        checks.hostnameProxied = webRecords.length > 0 && webRecords.every((record) => record.proxied === true);
        checks.strictTls = ssl.value === "strict";
        checks.managedWafConfigured = Boolean(waf.rules?.some((rule) => rule.enabled !== false && rule.action === "execute" && rule.expression === "true" && rule.action_parameters?.id));
        checks.message = canActivateDomain(checks)
          ? "Cloudflare proxy, Full (strict) TLS ve managed WAF yapılandırması doğrulandı. Kural istisnaları, origin erişimi ve açık testi ayrıca incelenmelidir."
          : "Eksik kontroller var. DNS proxy, aktif zone, Full (strict) TLS ve managed WAF dağıtımını kontrol et.";
      } catch (error) {
        checks.message = error instanceof Error ? error.message : "Sağlayıcı kontrolü başarısız.";
      }
    }
  }
  const ready = canActivateDomain(checks);
  const activated = ready && (activate || Boolean(domain.activatedAt));
  const result = await prisma.connectedDomain.update({ where: { id: domain.id }, data: {
    verifiedAt: ownership ? new Date() : null,
    lastCheckedAt: new Date(), lastCheck: { ...checks },
    status: !ownership ? "pending_verification" : activated ? "configuration_verified" : ready ? "ready_to_activate" : "setup_required",
    activatedAt: activated ? domain.activatedAt ?? new Date() : null,
  } });
  return { ...publicDomain(result), activationBlocked: activate && !ready };
}
