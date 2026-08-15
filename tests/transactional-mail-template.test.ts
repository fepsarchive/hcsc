import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderTransactionalMail } from "../src/server/mail/transactional-mail-template";

describe("transactional mail template", () => {
  it("renders one consistent HTML and text contract", () => {
    const result = renderTransactionalMail({
      title: "Test başlığı",
      greeting: "Merhaba Ayşe,",
      paragraphs: ["Güvenli işlem hazır."],
      action: { label: "İşlemi aç", url: "https://www.hcsc.space/action" },
      validity: "1 saat geçerli.",
      safetyNote: "İsteği tanımıyorsan dikkate alma.",
    });

    assert.match(result.html, /Hybrid Cloud Security Console/);
    assert.match(result.html, /https:\/\/www\.hcsc\.space\/action/);
    assert.match(result.text, /İşlemi aç:/);
  });

  it("escapes user-controlled values in HTML", () => {
    const result = renderTransactionalMail({
      title: "<script>alert(1)</script>",
      greeting: "Merhaba",
      paragraphs: ["Normal"],
      action: { label: "Aç", url: "https://example.com/?a=1&b=2" },
      validity: "Geçerli",
      safetyNote: "Güvenli",
    });

    assert.doesNotMatch(result.html, /<script>alert\(1\)<\/script>/);
    assert.match(result.html, /&lt;script&gt;/);
    assert.match(result.html, /a=1&amp;b=2/);
  });
});
