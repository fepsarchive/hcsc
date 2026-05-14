import { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import {
  createTwoFactorEnrollmentSecret,
  getTwoFactorEnrollmentContext,
  isTwoFactorEnrolled,
  shouldRotateTwoFactorSecret,
} from "@/server/auth/two-factor";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: false,
    target: "auth:2fa-setup",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const existingSecret = auth.context.session.user.twoFactorSecret;

  if (!existingSecret) {
    const enrollment = createTwoFactorEnrollmentSecret();
    const created = await prisma.twoFactorSecret.create({
      data: {
        userId: auth.context.session.userId,
        secret: enrollment.secret,
        issuer: process.env.TOTP_ISSUER?.trim() || "Hybrid Cloud Security Console",
        label: auth.context.session.user.email,
      },
    });

    const payload = getTwoFactorEnrollmentContext({
      email: auth.context.session.user.email,
      storedSecret: created.secret,
      issuer: created.issuer,
    });

    return apiOk(auth.context.requestId, {
      mode: "setup",
      alreadyEnrolled: false,
      ...payload,
    });
  }

  if (
    isTwoFactorEnrolled({
      secret: existingSecret.secret,
      enabledAt: existingSecret.enabledAt,
      enrolledAt: existingSecret.enrolledAt,
    })
  ) {
    return apiOk(auth.context.requestId, {
      mode: "verify",
      alreadyEnrolled: true,
    });
  }

  let secretValue = existingSecret.secret;
  let issuer = existingSecret.issuer;

  if (shouldRotateTwoFactorSecret(existingSecret.secret)) {
    const nextSecret = createTwoFactorEnrollmentSecret();
    const updated = await prisma.twoFactorSecret.update({
      where: { id: existingSecret.id },
      data: {
        secret: nextSecret.secret,
        issuer: existingSecret.issuer || process.env.TOTP_ISSUER?.trim() || "Hybrid Cloud Security Console",
        label: auth.context.session.user.email,
        enabledAt: null,
        enrolledAt: null,
        lastVerifiedAt: null,
        lastVerifiedStep: null,
      },
    });

    secretValue = updated.secret;
    issuer = updated.issuer;
  }

  try {
    const payload = getTwoFactorEnrollmentContext({
      email: auth.context.session.user.email,
      storedSecret: secretValue,
      issuer,
    });

    return apiOk(auth.context.requestId, {
      mode: "setup",
      alreadyEnrolled: false,
      ...payload,
    });
  } catch {
    return apiError(
      auth.context.requestId,
      500,
      "TWO_FACTOR_SETUP_UNAVAILABLE",
      "2FA kurulum bilgileri hazırlanamadı.",
    );
  }
}
