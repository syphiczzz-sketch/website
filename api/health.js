import { getWebhookUrl } from "../lib/application.js";

export function GET() {
  return Response.json(
    {
      ok: true,
      applicationsConfigured: Boolean(getWebhookUrl()),
      endpoint: "/api/apply"
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
