import { NextResponse } from "next/server";

import { withErrorHandler } from "@/lib/api/helpers";
export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  return NextResponse.json(
    {
      status: "ok",
      kind: "liveness",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
});
