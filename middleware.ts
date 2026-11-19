import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Middleware can't access localStorage (server-side).
  // Auth guards are handled client-side in layout components.
  return NextResponse.next();
}

export const config = { matcher: [] };
