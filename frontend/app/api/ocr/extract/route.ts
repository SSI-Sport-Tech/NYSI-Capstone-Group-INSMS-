import { NextRequest } from "next/server";
import { handleOCRRequest, methodNotAllowed } from "../utils";

export async function POST(request: NextRequest) {
  return handleOCRRequest(request, {
    endpoint: "extract",
    includeQueryParams: false, // extract endpoint doesn't use query params
  });
}

// Handle other HTTP methods
export async function GET() {
  return methodNotAllowed();
}
