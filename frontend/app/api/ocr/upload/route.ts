import { NextRequest } from "next/server";
import { handleOCRRequest, methodNotAllowed } from "../utils";

export async function POST(request: NextRequest) {
  return handleOCRRequest(request, {
    endpoint: "upload",
    includeQueryParams: false, // upload endpoint doesn't use query params
  });
}

// Handle other HTTP methods
export async function GET() {
  return methodNotAllowed();
}
