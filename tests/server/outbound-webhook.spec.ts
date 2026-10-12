import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import test from "node:test";
import { isPublicOutboundAddress, OutboundPolicyError, resolveSafeOutboundTarget } from "../../src/server/integrations/outbound-url-policy";
import { postSafeWebhook, type OutboundRequest, type OutboundRequestOptions } from "../../src/server/integrations/outbound-transport";

const env = { NODE_ENV: "production", HCSC_OUTBOUND_ALLOWED_HOSTS: "hooks.example.com" } as NodeJS.ProcessEnv;
const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];

test("webhook IP policy rejects special IPv4, mapped/transition IPv6 and malformed addresses", () => {
  for (const ip of ["0.1.2.3", "10.1.2.3", "100.64.0.1", "127.1.2.3", "169.254.169.254", "172.31.1.2", "192.0.0.8", "192.0.2.1", "192.168.1.1", "198.19.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::", "::1", "::ffff:7f00:1", "::ffff:8.8.8.8", "64:ff9b::a00:1", "fc00::1", "fe80::1%en0", "ff02::1", "2001::1", "2001:db8::1", "2002:7f00:1::", "3fff::1", "not-an-ip"]) {
    assert.equal(isPublicOutboundAddress(ip), false, ip);
  }
  for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111", "2001:4860:4860::8888"]) assert.equal(isPublicOutboundAddress(ip), true, ip);
});

test("URL checks run before DNS; allowlist is exact and mandatory in production", async () => {
  for (const url of ["http://hooks.example.com", "https://user:secret@hooks.example.com", "https://hooks.example.com:8443", "https://hooks.example.com/#fragment", "https://127.0.0.1", "https://0x7f000001", "https://[::1]", "https://localhost", "https://a.local", "https://a.home.arpa", "https://child.hooks.example.com", "https://hooks.example.com.attacker.test"]) {
    await assert.rejects(resolveSafeOutboundTarget(url, { env, resolve: async () => { assert.fail("DNS must not run"); } }), OutboundPolicyError);
  }
  await assert.rejects(resolveSafeOutboundTarget("https://hooks.example.com", { env: { NODE_ENV: "production" }, resolve: publicDns }), OutboundPolicyError);
  const target = await resolveSafeOutboundTarget("https://HOOKS.example.com./test", { env, resolve: publicDns });
  assert.equal(target.url.hostname, "hooks.example.com");
});

test("all DNS answers must be public; resolver errors and deadlines are sanitized", async () => {
  for (const answers of [[], [{ address: "8.8.8.8", family: 6 }], [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]]) {
    await assert.rejects(resolveSafeOutboundTarget("https://hooks.example.com", { env, resolve: async () => answers }), OutboundPolicyError);
  }
  await assert.rejects(resolveSafeOutboundTarget("https://hooks.example.com", { env, resolve: async () => { throw new Error("private-resolver-secret"); } }), (error: Error) => error instanceof OutboundPolicyError && !error.message.includes("secret"));
  await assert.rejects(resolveSafeOutboundTarget("https://hooks.example.com", { env, timeoutMs: 5, resolve: () => new Promise(() => {}) }), /süresi/);
});

function transportFixture(status: number, bytes = 0, hang = false) {
  let captured: OutboundRequestOptions | undefined;
  let destroyed = false;
  const request: OutboundRequest = (options, callback) => {
    captured = options;
    const req = new EventEmitter() as ClientRequest;
    req.destroy = (() => { destroyed = true; return req; }) as ClientRequest["destroy"];
    req.end = (() => {
      if (!hang) queueMicrotask(() => {
        const res = new EventEmitter() as IncomingMessage;
        res.statusCode = status;
        res.headers = { location: "http://127.0.0.1/secret" };
        res.destroy = (() => res) as IncomingMessage["destroy"];
        callback(res);
        if (bytes) res.emit("data", Buffer.alloc(bytes));
        res.emit("end");
      });
      return req;
    }) as ClientRequest["end"];
    return req;
  };
  return { request, options: () => captured!, destroyed: () => destroyed };
}

test("socket lookup is pinned while TLS validates original hostname; redirects never follow", async () => {
  let resolutions = 0;
  const fixture = transportFixture(302);
  const result = await postSafeWebhook("https://hooks.example.com/hook?event=1", "{}", {}, {
    env, request: fixture.request,
    resolve: async () => { resolutions++; return publicDns(); },
  });
  assert.deepEqual(result, { status: 302, ok: false });
  const options = fixture.options();
  assert.equal(options.hostname, "hooks.example.com");
  assert.equal(options.servername, "hooks.example.com");
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.agent, false);
  assert.equal(options.autoSelectFamily, false);
  assert.equal(options.path, "/hook?event=1");
  await new Promise<void>((resolve) => options.lookup!("hooks.example.com", {}, (error, address, family) => {
    assert.equal(error, null); assert.equal(address, "93.184.216.34"); assert.equal(family, 4); resolve();
  }));
  assert.equal(resolutions, 1);
});

test("transport bounds outgoing body, incoming response and hanging requests", async () => {
  const large = transportFixture(200, 65 * 1024);
  await assert.rejects(postSafeWebhook("https://hooks.example.com", "{}", {}, { env, resolve: publicDns, request: large.request }));
  assert.equal(large.destroyed(), true);
  const hanging = transportFixture(200, 0, true);
  await assert.rejects(postSafeWebhook("https://hooks.example.com", "{}", {}, { env, resolve: publicDns, request: hanging.request, timeoutMs: 10 }));
  assert.equal(hanging.destroyed(), true);
  await assert.rejects(postSafeWebhook("https://hooks.example.com", "x".repeat(257 * 1024), {}, { resolve: async () => { assert.fail("DNS must not run"); } }), /size/);
  const success = transportFixture(204);
  assert.deepEqual(await postSafeWebhook("https://hooks.example.com", "{}", {}, { env, resolve: publicDns, request: success.request }), { status: 204, ok: true });
});
