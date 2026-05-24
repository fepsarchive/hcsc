import { Resend } from "resend";

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

const PASSWORD_RESET_SUBJECT = "HCSC şifre sıfırlama bağlantınız";
const TEAM_INVITE_SUBJECT = "HCSC çalışma alanı davetiniz";

function getMailerConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from: process.env.MAIL_FROM?.trim(),
    appUrl: process.env.APP_URL?.trim(),
    isProduction: process.env.NODE_ENV === "production",
  };
}

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [localPart = "", domainPart = ""] = normalized.split("@");

  if (!domainPart) {
    return "***";
  }

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart.charAt(0) || "*"}*`
      : `${localPart.slice(0, 2)}***`;

  const domainSegments = domainPart.split(".");
  const domainName = domainSegments[0] ?? "";
  const domainSuffix = domainSegments.slice(1).join(".");
  const visibleDomain =
    domainName.length <= 2 ? `${domainName.charAt(0) || "*"}*` : `${domainName.slice(0, 2)}***`;

  return `${visibleLocal}@${visibleDomain}${domainSuffix ? `.${domainSuffix}` : ""}`;
}

function buildPasswordResetText(input: PasswordResetMailInput) {
  const greeting = input.recipientName?.trim()
    ? `Merhaba ${input.recipientName.trim()},`
    : "Merhaba,";

  return [
    greeting,
    "",
    "HCSC hesabın için bir şifre sıfırlama talebi aldık.",
    "Yeni parolanı belirlemek için aşağıdaki bağlantıyı kullanabilirsin:",
    input.resetUrl,
    "",
    "Bu bağlantı 1 saat boyunca geçerlidir.",
    "Bu isteği sen yapmadıysan bu e-postayı dikkate alma ve destek ekibiyle iletişime geç.",
    "",
    "Hybrid Cloud Security Console",
  ].join("\n");
}

function buildPasswordResetHtml(input: PasswordResetMailInput) {
  const greeting = input.recipientName?.trim()
    ? `Merhaba ${input.recipientName.trim()},`
    : "Merhaba,";

  return `
    <div style="background:#0b1020;padding:32px;font-family:Inter,Arial,sans-serif;color:#e5eefc;">
      <div style="max-width:640px;margin:0 auto;background:#121a2e;border:1px solid rgba(148,163,184,0.18);border-radius:24px;padding:32px;">
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#7dd3fc;">Hybrid Cloud Security Console</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#f8fafc;">Şifre sıfırlama bağlantınız hazır</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1;">${greeting}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1;">
          HCSC hesabın için bir şifre sıfırlama talebi aldık. Yeni parolanı belirlemek için aşağıdaki güvenli bağlantıyı kullanabilirsin.
        </p>
        <div style="margin:28px 0;">
          <a href="${input.resetUrl}" style="display:inline-block;background:#f8fafc;color:#111827;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:600;">
            Şifreyi yenile
          </a>
        </div>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#94a3b8;">
          Bu bağlantı <strong style="color:#e2e8f0;">1 saat</strong> boyunca geçerlidir.
        </p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#94a3b8;">
          Bu isteği sen yapmadıysan bu e-postayı dikkate alma. Ek güvenlik desteği için kurum içi destek ekibine başvurabilirsin.
        </p>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#64748b;word-break:break-all;">
          Bağlantı: ${input.resetUrl}
        </p>
      </div>
    </div>
  `;
}

export async function sendPasswordResetMail(input: PasswordResetMailInput): Promise<MailSendResult> {
  const config = getMailerConfig();
  const maskedRecipient = maskEmail(input.to);

  console.info("[mail] password reset email config status", {
    hasResendApiKey: Boolean(config.apiKey),
    hasMailFrom: Boolean(config.from),
    hasAppUrl: Boolean(config.appUrl),
    recipient: maskedRecipient,
    env: process.env.NODE_ENV,
  });

  if (!config.apiKey || !config.from || !config.appUrl) {
    console.warn("[mail] password reset email skipped", {
      reason: "missing-config",
      hasResendApiKey: Boolean(config.apiKey),
      hasMailFrom: Boolean(config.from),
      hasAppUrl: Boolean(config.appUrl),
      recipient: maskedRecipient,
      env: process.env.NODE_ENV,
    });

    return {
      success: false,
      reason: "missing-config",
    };
  }

  try {
    const resend = new Resend(config.apiKey);

    console.info("[mail] password reset email send attempted", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
    });

    await resend.emails.send({
      from: config.from,
      to: input.to,
      subject: PASSWORD_RESET_SUBJECT,
      html: buildPasswordResetHtml(input),
      text: buildPasswordResetText(input),
    });

    console.info("[mail] password reset email send success", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
    });

    return { success: true };
  } catch (error) {
    console.error("[mail] password reset email send failed", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
      error:
        error instanceof Error
          ? {
              code: error.name,
              name: error.name,
              message: error.message,
            }
          : "unknown",
    });

    return {
      success: false,
      reason: "delivery-failed",
    };
  }
}

function buildTeamInviteText(input: TeamInviteMailInput) {
  return [
    "Merhaba,",
    "",
    `${input.organizationName} çalışma alanına ${input.roleLabel} rolüyle davet edildin.`,
    `Davet gönderen: ${input.inviterName}`,
    "",
    "Davet bağlantısını açarak hesabınla giriş yapabilir ve üyeliği onaylayabilirsin:",
    input.inviteUrl,
    "",
    "Bağlantı 7 gün boyunca geçerlidir.",
    "Bu daveti beklemiyorsan e-postayı dikkate alma veya güvenlik ekibinle iletişime geç.",
    "",
    "Hybrid Cloud Security Console",
  ].join("\n");
}

function buildTeamInviteHtml(input: TeamInviteMailInput) {
  return `
    <div style="background:#0b1020;padding:32px;font-family:Inter,Arial,sans-serif;color:#e5eefc;">
      <div style="max-width:640px;margin:0 auto;background:#121a2e;border:1px solid rgba(148,163,184,0.18);border-radius:24px;padding:32px;">
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#7dd3fc;">Hybrid Cloud Security Console</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#f8fafc;">Çalışma alanı davetin hazır</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1;">
          <strong style="color:#f8fafc;">${input.organizationName}</strong> çalışma alanına
          <strong style="color:#f8fafc;"> ${input.roleLabel}</strong> rolüyle davet edildin.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1;">
          Daveti gönderen: <strong style="color:#f8fafc;">${input.inviterName}</strong>
        </p>
        <div style="margin:28px 0;">
          <a href="${input.inviteUrl}" style="display:inline-block;background:#f8fafc;color:#111827;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:600;">
            Daveti görüntüle
          </a>
        </div>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#94a3b8;">
          Bu bağlantı <strong style="color:#e2e8f0;">7 gün</strong> boyunca geçerlidir.
        </p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#94a3b8;">
          Hesabınla giriş yaptıktan sonra daveti onaylayabilirsin. Bu daveti beklemiyorsan e-postayı dikkate alma.
        </p>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#64748b;word-break:break-all;">
          Bağlantı: ${input.inviteUrl}
        </p>
      </div>
    </div>
  `;
}

export async function sendTeamInviteMail(input: TeamInviteMailInput): Promise<MailSendResult> {
  const config = getMailerConfig();
  const maskedRecipient = maskEmail(input.to);

  console.info("[mail] team invite email config status", {
    hasResendApiKey: Boolean(config.apiKey),
    hasMailFrom: Boolean(config.from),
    hasAppUrl: Boolean(config.appUrl),
    recipient: maskedRecipient,
    env: process.env.NODE_ENV,
  });

  if (!config.apiKey || !config.from || !config.appUrl) {
    console.warn("[mail] team invite email skipped", {
      reason: "missing-config",
      hasResendApiKey: Boolean(config.apiKey),
      hasMailFrom: Boolean(config.from),
      hasAppUrl: Boolean(config.appUrl),
      recipient: maskedRecipient,
      env: process.env.NODE_ENV,
    });

    return {
      success: false,
      reason: "missing-config",
    };
  }

  try {
    const resend = new Resend(config.apiKey);

    console.info("[mail] team invite email send attempted", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
    });

    await resend.emails.send({
      from: config.from,
      to: input.to,
      subject: TEAM_INVITE_SUBJECT,
      html: buildTeamInviteHtml(input),
      text: buildTeamInviteText(input),
    });

    console.info("[mail] team invite email send success", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
    });

    return { success: true };
  } catch (error) {
    console.error("[mail] team invite email send failed", {
      recipient: maskedRecipient,
      provider: "resend",
      env: process.env.NODE_ENV,
      error:
        error instanceof Error
          ? {
              code: error.name,
              name: error.name,
              message: error.message,
            }
          : "unknown",
    });

    return {
      success: false,
      reason: "delivery-failed",
    };
  }
}
