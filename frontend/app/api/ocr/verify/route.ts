import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/utils/backendUrl";

export const maxDuration = 360;

const BACKEND_URL = process.env.BACKEND_URL || getBackendUrl();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const backendRes = await fetch(`${BACKEND_URL}/api/ocr/verify`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(360_000),
        });

        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Verify proxy] Error:", message);

        if (message.includes("timed out") || message.includes("abort")) {
            return NextResponse.json(
                { success: false, error: "Verification timed out. Certification sites are slow to respond. Please try again." },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { success: false, error: "Failed to reach verification service." },
            { status: 502 }
        );
    }
}