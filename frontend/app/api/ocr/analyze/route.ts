import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/utils/backendUrl";

// Allow up to 5 minutes for OCR processing (Vercel + local)
export const maxDuration = 300;

const BACKEND_URL =
  process.env.BACKEND_URL || getBackendUrl();

export async function POST(req: NextRequest) {
  try {
    // Forward the raw multipart body directly to the backend
    const contentType = req.headers.get("content-type") || "";
    const body = await req.arrayBuffer();

    const backendRes = await fetch(`${BACKEND_URL}/api/ocr/analyze`, {
      method: "POST",
      headers: {
        "content-type": contentType,
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization")! }
          : {}),
      },
      body,
      // Node.js fetch has no built-in timeout; use AbortSignal for 5 min
      signal: AbortSignal.timeout(300_000),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[OCR proxy] Error:", message);

    if (message.includes("timed out") || message.includes("abort")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OCR processing timed out (5 min limit). Try a smaller or clearer image.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to reach OCR service." },
      { status: 502 },
    );
  }
}
