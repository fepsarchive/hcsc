import { Resend } from "resend";

import { renderTransactionalMail, type TransactionalMailContent } from "@/server/mail/transactional-mail-template";

type PasswordResetMailInput = {
  to: string;
  resetUrl: string;
  recipientName?: string | null;
};

type TeamInviteMailInput = {
  to: string;
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  roleLabel: string;
};

type MailSendResult = {
  success: boolean;
  reason?: "missing-config" | "delivery-failed";
};

function getMailerConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from: process.env.MAIL_FROM?.trim(),
    appUrl: process.env.APP_URL?.trim(),
  };
}

function maskEmail(email: string) {
  const [localPart = "", domainPart = ""] = email.trim().toLowerCase().split("@");
  if (!domainPart) return "***";
  const domainSegments = domainPart.split(".");
  const domainName = domainSegments.shift() ?? "";
  const suffix = domainSegments.join(".");
  return `${localPart.slice(0, 2) || "*"}***@${domainName.slice(0, 2) || "*"}***${suffix ? `.${suffix}` : ""}`;
}

async function sendTransactionalMail(input: {
  kind: "password_reset" | "team_invite";
  to: string;
  subject: string;
  content: TransactionalMailContent;
}): Promise<MailSendResult> {
  const config = getMailerConfig();
  const recipient = maskEmail(input.to);

  if (!config.apiKey || !config.from || !config.appUrl) {
    console.warn("[mail] transactional email skipped", {
      kind: input.kind,
      reason: "missing-config",
      hasResendApiKey: Boolean(config.apiKey),
      hasMailFrom: Boolean(config.from),
      hasAppUrl: Boolean(config.appUrl),
      recipient,
      env: process.env.NODE_ENV,
    });
    return { success: false, reason: "missing-config" };
  }

  try {
    const body = renderTransactionalMail(input.content);
    await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: body.html,
      text: body.text,
    });
    console.info("[mail] transactional email sent", { kind: input.kind, recipient, provider: "resend", env: process.env.NODE_ENV });
    return { success: true };
  } catch (error) {
    console.error("[mail] transactional email failed", {
      kind: input.kind,
      recipient,
      provider: "resend",
      env: process.env.NODE_ENV,
      error: error instanceof Error ? { name: error.name, message: error.message } : "unknown",
    });
    return { success: false, reason: "delivery-failed" };
  }
}

export async function sendPasswordResetMail(input: PasswordResetMailInput) {
  return sendTransactionalMail({
    kind: "password_reset",
    to: input.to,
    subject: "HCSC şifre sıfırlama bağlantınız",
    content: {
      title: "Şifre sıfırlama bağlantınız hazır",
      greeting: input.recipientName?.trim() ? `Merhaba ${input.recipientName.trim()},` : "Merhaba,",
      paragraphs: ["HCSC hesabın için bir şifre sıfırlama talebi aldık. Yeni parolanı güvenli bağlantı üzerinden belirleyebilirsin."],
      action: { label: "Şifreyi yenile", url: input.resetUrl },
      validity: "Bu bağlantı 1 saat boyunca geçerlidir.",
      safetyNote: "Bu isteği sen yapmadıysan e-postayı dikkate alma ve güvenlik ekibinle iletişime geç.",
    },
  });
}

export async function sendTeamInviteMail(input: TeamInviteMailInput) {
  return sendTransactionalMail({
    kind: "team_invite",
    to: input.to,
    subject: "HCSC çalışma alanı davetiniz",
    content: {
      title: "Çalışma alanı davetin hazır",
      greeting: "Merhaba,",
      paragraphs: [
        `${input.organizationName} çalışma alanına ${input.roleLabel} rolüyle davet edildin.`,
        `Daveti gönderen: ${input.inviterName}`,
      ],
      action: { label: "Daveti görüntüle", url: input.inviteUrl },
      validity: "Bu bağlantı 7 gün boyunca geçerlidir.",
      safetyNote: "Bu daveti beklemiyorsan e-postayı dikkate alma veya güvenlik ekibinle iletişime geç.",
    },
  });
}
