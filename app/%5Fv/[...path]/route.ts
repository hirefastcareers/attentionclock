import { NextRequest, NextResponse } from "next/server";

const HUB = "https://hub.vemetric.com";

const FORWARD_REQUEST_HEADERS = [
  "token",
  "allow-cookies",
  "v-host",
  "v-sdk",
  "v-sdk-version",
  "content-type",
  "v-referrer",
] as const;

function buildTargetUrl(path: string[], request: NextRequest) {
  const suffix = path.join("/");
  const url = new URL(suffix, `${HUB}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function forwardHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function proxyToHub(request: NextRequest, path: string[]) {
  const headers = forwardHeaders(request);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const response = await fetch(buildTargetUrl(path, request), {
    method: request.method,
    headers,
    body,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToHub(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToHub(request, path);
}
