"use client";

import { mockAuthAccounts, type MockAuthAccount } from "@/lib/auth-mock-data";

const DEMO_AUTH_ACCOUNTS_KEY = "hcsc-demo-auth-accounts";
const ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS = process.env.NODE_ENV !== "production";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredAccounts(): MockAuthAccount[] {
  if (!ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS || !isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(DEMO_AUTH_ACCOUNTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MockAuthAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: MockAuthAccount[]) {
  if (!ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS || !isBrowser()) {
    return;
  }

  window.localStorage.setItem(DEMO_AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function buildAvatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "HC";
}

export function getAvailableMockAuthAccounts() {
  if (!ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS) {
    return [];
  }

  const baseByEmail = new Map(
    mockAuthAccounts.map((account) => [normalizeEmail(account.email), account]),
  );

  for (const account of readStoredAccounts()) {
    baseByEmail.set(normalizeEmail(account.email), account);
  }

  return Array.from(baseByEmail.values());
}

export function upsertStoredDemoAuthAccount(account: MockAuthAccount) {
  if (!ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS) {
    return;
  }

  const next = readStoredAccounts();
  const normalizedEmail = normalizeEmail(account.email);
  const existingIndex = next.findIndex((entry) => normalizeEmail(entry.email) === normalizedEmail);

  if (existingIndex >= 0) {
    next[existingIndex] = account;
  } else {
    next.unshift(account);
  }

  writeStoredAccounts(next.slice(0, 25));
}

export function isCustomDemoAuthAccount(email: string) {
  if (!ENABLE_DEVELOPMENT_LOCAL_ACCOUNTS) {
    return false;
  }

  const normalizedEmail = normalizeEmail(email);
  const isSeeded = mockAuthAccounts.some((account) => normalizeEmail(account.email) === normalizedEmail);

  if (isSeeded) {
    return false;
  }

  return readStoredAccounts().some((account) => normalizeEmail(account.email) === normalizedEmail);
}
