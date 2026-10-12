import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("Cloud Map route/view and navigation references are removed", () => {
  for (const path of ["src/app/cloud-map/page.tsx", "src/components/cloud-map/cloud-map-view.tsx"]) assert.equal(existsSync(path), false);
  for (const path of ["src/components/app-sidebar.tsx", "src/components/layout/sidebar.tsx", "src/components/layout/header.tsx", "src/components/site-header.tsx", "src/components/layout/breadcrumbs.tsx", "src/lib/mock-data.ts", "src/types/index.ts", "src/server/services/core/environment-service.ts"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /cloud-map|CloudMap|cloudNodes|cloudLinks/);
  }
});

test("public auth screens expose no signup links and legacy signup redirects", () => {
  for (const path of ["src/app/login/page.tsx", "src/app/forgot-password/page.tsx", "src/app/accept-invite/page.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /Href="\/register"|href="\/register"/);
  }
  assert.match(readFileSync("src/app/register/page.tsx", "utf8"), /redirect\("\/login"\)/);
});
