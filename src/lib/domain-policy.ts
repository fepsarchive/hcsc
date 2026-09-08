export function normalizeDomain(input: string) {
  const value = input.trim().toLowerCase().replace(/\.$/, "");
  if (value.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) {
    throw new Error("Yalnızca domain adını yaz (ör. mertcanyildirim.com); URL, port veya yol ekleme.");
  }
  if (/\.(localhost|local|internal|invalid|test|example)$/.test(value)) throw new Error("Herkese açık bir domain gerekli.");
  return value;
}

export function hasOwnershipRecord(records: string[][], token: string) {
  return records.some((chunks) => chunks.join("") === `hcsc-verification=${token}`);
}

export type DomainChecks = {
  ownership: boolean;
  zoneActive: boolean;
  hostnameProxied: boolean;
  strictTls: boolean;
  managedWafConfigured: boolean;
  checkedAt: string;
  message: string;
};

// Configuration evidence is not an exploit test or an absolute security guarantee.
export function canActivateDomain(checks: DomainChecks) {
  return checks.ownership && checks.zoneActive && checks.hostnameProxied && checks.strictTls && checks.managedWafConfigured;
}
