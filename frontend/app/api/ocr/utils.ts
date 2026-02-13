import { NextRequest, NextResponse } from "next/server";

export interface OCRConfig {
  endpoint: string;
  includeQueryParams?: boolean;
}

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const OCR_TIMEOUT = parseInt(process.env.OCR_TIMEOUT || "300000"); // 5 minutes default

/**
 * Generic OCR proxy handler with timeout control
 * @param request Next.js request object
 * @param config Configuration for the specific OCR endpoint
 * @returns NextResponse with proper error handling
 */
export async function handleOCRRequest(
  request: NextRequest,
  config: OCRConfig,
): Promise<NextResponse> {
  try {
    // Create a new AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT);

    // Get the form data from the request
    const formData = await request.formData();

    // Build the backend URL
    const backendUrl = new URL(`${BACKEND_URL}/api/ocr/${config.endpoint}`);

    // Add query parameters if needed (for endpoints like analyze)
    if (config.includeQueryParams) {
      const searchParams = request.nextUrl.searchParams;
      searchParams.forEach((value, key) => {
        backendUrl.searchParams.set(key, value);
      });
    }

    console.log(`Proxying OCR request to: ${backendUrl.toString()}`);

    // Forward the request to the Express backend
    const response = await fetch(backendUrl.toString(), {
      method: "POST",
      body: formData,
      signal: controller.signal,
      // Don't set Content-Type header - let fetch handle it for FormData
    });

    // Clear the timeout since we got a response
    clearTimeout(timeoutId);

    // Check if the response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Backend ${config.endpoint} error:`,
        response.status,
        errorText,
      );
      return NextResponse.json(
        { success: false, error: "Backend service error" },
        { status: response.status },
      );
    }

    // Parse the response from backend
    const data = await response.json();

    // Return the response with proper headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error(`OCR ${config.endpoint} error:`, error);

    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error:
            "OCR processing timeout. Please try again with a smaller image or try again later.",
        },
        { status: 504 },
      );
    }

    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Backend service unavailable. Please ensure the Express server is running.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error during OCR processing" },
      { status: 500 },
    );
  }
}

/**
 * Standard method not allowed response
 */
export function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
