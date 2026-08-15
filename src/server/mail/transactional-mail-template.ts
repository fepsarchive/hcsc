export type TransactionalMailContent = {
  eyebrow?: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  action: { label: string; url: string };
  validity: string;
  safetyNote: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export function renderTransactionalMail(content: TransactionalMailContent) {
  const safe = {
    eyebrow: escapeHtml(content.eyebrow ?? "Hybrid Cloud Security Console"),
    title: escapeHtml(content.title),
    greeting: escapeHtml(content.greeting),
    paragraphs: content.paragraphs.map(escapeHtml),
    actionLabel: escapeHtml(content.action.label),
    actionUrl: escapeHtml(content.action.url),
    validity: escapeHtml(content.validity),
    safetyNote: escapeHtml(content.safetyNote),
  };

  const text = [
    safe.greeting,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${content.action.label}:`,
    content.action.url,
    "",
    content.validity,
    content.safetyNote,
    "",
    "Hybrid Cloud Security Console",
  ].join("\n");

  const html = `<!doctype html>
<html lang="tr"><body style="margin:0;background:#07090d;padding:28px 16px;font-family:Inter,Arial,sans-serif;color:#f4f7fb;">
  <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #27303c;border-radius:24px;background:#11151b;box-shadow:0 20px 60px rgba(0,0,0,.32);">
    <div style="height:4px;background:linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa);"></div>
    <div style="padding:32px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#67e8f9;">${safe.eyebrow}</p>
      <h1 style="margin:0 0 22px;font-size:28px;line-height:1.2;letter-spacing:-.02em;color:#f8fafc;">${safe.title}</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#d5dce7;">${safe.greeting}</p>
      ${safe.paragraphs.map((paragraph) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#aeb8c7;">${paragraph}</p>`).join("")}
      <div style="margin:26px 0;"><a href="${safe.actionUrl}" style="display:inline-block;border-radius:12px;background:#f8fafc;padding:13px 20px;color:#10141a;text-decoration:none;font-size:14px;font-weight:700;">${safe.actionLabel}</a></div>
      <div style="border:1px solid #27303c;border-radius:14px;background:#0c1015;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:13px;line-height:1.65;color:#d5dce7;">${safe.validity}</p>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#7f8a99;">${safe.safetyNote}</p>
      </div>
      <p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#586475;word-break:break-all;">${safe.actionUrl}</p>
    </div>
  </div>
</body></html>`;

  return { html, text };
}
