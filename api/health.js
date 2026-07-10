import { getWebhookUrl } from "../lib/application.js";

export default {
  fetch() {
    return Response.json(
      {
        ok: true,
        applicationsConfigured: Boolean(getWebhookUrl())
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      }
    );
  }
};
