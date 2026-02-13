import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Allow up to 2 minutes for OCR processing
export const maxDuration = 120;
export const dynamic = "force-dynamic";

async function proxyToBackend(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${BACKEND_URL}/api/ocr/${targetPath}${request.nextUrl.search}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    // Forward the request headers, excluding host/connection
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
    };

    // Forward body for POST/PUT/PATCH
    if (request.method !== "GET" && request.method !== "HEAD") {
      fetchOptions.body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, fetchOptions);

    const responseData = await response.arrayBuffer();

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "OCR service timeout. Please try again." },
        { status: 504 }
      );
    }
    console.error("[OCR Proxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend service." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const POST = proxyToBackend;
export const GET = proxyToBackend;
