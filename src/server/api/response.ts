import { NextResponse } from "next/server";

type MetaExtras = Record<string, unknown> | undefined;

export function createMeta(requestId: string, extras?: MetaExtras) {
  return {
    requestId,
    ...(extras ?? {}),
  };
}

export function apiOk<T>(requestId: string, data: T, extras?: MetaExtras, status = 200) {
  return NextResponse.json(
    {
      data,
      meta: createMeta(requestId, extras),
      error: null,
    },
    { status },
  );
}

export function apiCreated<T>(requestId: string, data: T, extras?: MetaExtras) {
  return apiOk(requestId, data, extras, 201);
}

export function apiError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  extras?: MetaExtras,
) {
  return NextResponse.json(
    {
      data: null,
      meta: createMeta(requestId, extras),
      error: {
        code,
        message,
      },
    },
    { status },
  );
}
