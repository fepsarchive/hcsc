import assert from "node:assert/strict";
import test from "node:test";
import { canActivateDomain, hasOwnershipRecord, normalizeDomain, type DomainChecks } from "../src/lib/domain-policy";
import { renderTransactionalMail } from "../src/server/mail/transactional-mail-template";

test("domain normalization rejects URLs, internal hosts, credentials, ports and IP addresses", () => {
  assert.equal(normalizeDomain(" MertcanYildirim.com. "), "mertcanyildirim.com");
  for (const value of ["https://mertcanyildirim.com", "localhost", "127.0.0.1", "app.local", "a.internal", "site.com:443", "user@site.com", "site.com/path", "*.site.com", "-a.com", "a..com"]) {
    assert.throws(() => normalizeDomain(value), value);
  }
});

test("DNS ownership requires the exact challenge including chunked TXT strings", () => {
  assert.equal(hasOwnershipRecord([["hcsc-verification=", "abc"]], "abc"), true);
  assert.equal(hasOwnershipRecord([["hcsc-verification=abc-extra"]], "abc"), false);
  assert.equal(hasOwnershipRecord([["abc"]], "abc"), false);
  assert.equal(hasOwnershipRecord([], "abc"), false);
});

test("every protection prerequisite is required for activation", () => {
  const checks: DomainChecks = { ownership: true, zoneActive: true, hostnameProxied: true, strictTls: true, managedWafConfigured: true, checkedAt: new Date().toISOString(), message: "ok" };
  assert.equal(canActivateDomain(checks), true);
  for (const key of ["ownership", "zoneActive", "hostnameProxied", "strictTls", "managedWafConfigured"] as const) assert.equal(canActivateDomain({ ...checks, [key]: false }), false, key);
});

test("transactional mail escapes HTML without corrupting the plain-text greeting", () => {
  const result = renderTransactionalMail({ title: "Test", greeting: "A & B <team>", paragraphs: ["Hello"], action: { label: "Open", url: "https://hcsc.space" }, validity: "1h", safetyNote: "Test" });
  assert.match(result.html, /A &amp; B &lt;team&gt;/);
  assert.match(result.text, /A & B <team>/);
});
