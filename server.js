import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  createDiscordPayload,
  deliverApplication,
  getWebhookUrl,
  validateApplication
} from "./lib/application.js";

const currentFile = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFile);
const publicDirectory = path.join(__dirname, "public");
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY !== "false" ? 1 : false);
app.use(express.json({ limit: "32kb" }));

app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  next();
});

const submissions = new Map();
const rateLimitWindowMs = 60 * 60 * 1000;
const maxSubmissionsPerWindow = 3;

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

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ipAddress, timestamps] of submissions.entries()) {
    const recent = timestamps.filter(
      (timestamp) => now - timestamp < rateLimitWindowMs
    );
    if (recent.length === 0) submissions.delete(ipAddress);
    else submissions.set(ipAddress, recent);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    applicationsConfigured: Boolean(getWebhookUrl())
  });
});

app.post("/api/apply", async (request, response) => {
  const result = validateApplication(request.body || {});

  if (result.honeypot) return response.status(200).json({ ok: true });
  if (result.error) {
    return response.status(400).json({ ok: false, error: result.error });
  }

  if (isRateLimited(request.ip || "unknown")) {
    return response.status(429).json({
      ok: false,
      error: "Too many applications were submitted. Please try again later."
    });
  }

  const delivery = await deliverApplication(result.application);
  if (!delivery.ok) {
    return response
      .status(delivery.status)
      .json({ ok: false, error: delivery.error });
  }

  return response
    .status(delivery.status)
    .json({ ok: true, applicationId: delivery.applicationId });
});

app.use(
  express.static(publicDirectory, {
    extensions: ["html"],
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
  })
);

app.use((_request, response) => {
  response.status(404).sendFile(path.join(publicDirectory, "404.html"));
});

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  app.listen(port, () => {
    console.log(`Northweld Games website running on http://localhost:${port}`);
  });
}

export { app, createDiscordPayload, validateApplication };
export default app;
