import { deliverApplication, validateApplication } from "../lib/application.js";

const submissions = new Map();
const rateLimitWindowMs = 60 * 60 * 1000;
const maxSubmissionsPerWindow = 3;

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  const recent = (submissions.get(ipAddress) || []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs
  );

  if (recent.length >= maxSubmissionsPerWindow) {
    submissions.set(ipAddress, recent);
    return true;
  }

  recent.push(now);
  submissions.set(ipAddress, recent);
  return false;
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid application data." }, 400);
  }

  const result = validateApplication(body);
  if (result.honeypot) return json({ ok: true });
  if (result.error) return json({ ok: false, error: result.error }, 400);

  if (isRateLimited(getClientIp(request))) {
    return json(
      {
        ok: false,
        error: "Too many applications were submitted. Please try again later."
      },
      429
    );
  }

  const delivery = await deliverApplication(result.application);
  if (!delivery.ok) {
    return json({ ok: false, error: delivery.error }, delivery.status);
  }

  return json(
    { ok: true, applicationId: delivery.applicationId },
    delivery.status
  );
}

export function GET() {
  return json({ ok: false, error: "Use POST to submit an application." }, 405);
}
