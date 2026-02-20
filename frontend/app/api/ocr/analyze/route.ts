import { NextRequest } from "next/server";
import { handleOCRRequest, methodNotAllowed } from "../utils";

export async function POST(request: NextRequest) {
  return handleOCRRequest(request, {
    endpoint: "analyze",
    includeQueryParams: true, // analyze endpoint uses page & per_page params
  });
}

// Handle other HTTP methods
export async function GET() {
  return methodNotAllowed();
}
