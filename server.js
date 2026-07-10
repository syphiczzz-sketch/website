import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import {
  createDiscordPayload,
  deliverApplication,
  getWebhookUrl,
  validateApplication
} from "./lib/application.js";

const currentFile = fileURLToPath(import.meta.url);
const rootDirectory = path.dirname(currentFile);
const publicDirectory = path.join(rootDirectory, "public");
function loadLocalEnvironment() {
  const envPath = path.join(rootDirectory, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnvironment();
const port = Number(process.env.PORT || 3000);

const submissions = new Map();
const rateLimitWindowMs = 60 * 60 * 1000;
const maxSubmissionsPerWindow = 3;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function applySecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
}

function sendJson(response, status, data) {
  applySecurityHeaders(response);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
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

async function readJsonBody(request, maximumBytes = 32 * 1024) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maximumBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error("Invalid application data.");
    error.status = 400;
    throw error;
  }
}

async function handleApply(request, response) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return sendJson(response, error.status || 400, {
      ok: false,
      error: error.message
    });
  }

  const result = validateApplication(body);
  if (result.honeypot) return sendJson(response, 200, { ok: true });
  if (result.error) {
    return sendJson(response, 400, { ok: false, error: result.error });
  }

  if (isRateLimited(getClientIp(request))) {
    return sendJson(response, 429, {
      ok: false,
      error: "Too many applications were submitted. Please try again later."
    });
  }

  const delivery = await deliverApplication(result.application);
  if (!delivery.ok) {
    return sendJson(response, delivery.status, {
      ok: false,
      error: delivery.error
    });
  }

  return sendJson(response, delivery.status, {
    ok: true,
    applicationId: delivery.applicationId
  });
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const withExtension = path.extname(requested) ? requested : `${requested}.html`;
  const resolved = path.resolve(publicDirectory, `.${withExtension}`);
  return resolved.startsWith(publicDirectory) ? resolved : null;
}

async function serveStatic(request, response) {
  let filePath = safePublicPath(request.url || "/");
  let statusCode = 200;

  if (!filePath) {
    filePath = path.join(publicDirectory, "404.html");
    statusCode = 404;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
  } catch {
    filePath = path.join(publicDirectory, "404.html");
    statusCode = 404;
  }

  try {
    const content = await readFile(filePath);
    applySecurityHeaders(response);
    response.writeHead(statusCode, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": process.env.NODE_ENV === "production" ? "public, max-age=3600" : "no-cache"
    });
    response.end(content);
  } catch {
    sendJson(response, 500, { ok: false, error: "The website could not be loaded." });
  }
}

async function requestHandler(request, response) {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;

  if (pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, {
      ok: true,
      applicationsConfigured: Boolean(getWebhookUrl()),
      endpoint: "/api/apply"
    });
  }

  if (pathname === "/api/apply") {
    if (request.method !== "POST") {
      return sendJson(response, 405, {
        ok: false,
        error: "Use POST to submit an application."
      });
    }
    return handleApply(request, response);
  }

  return serveStatic(request, response);
}

const app = {
  listen(...args) {
    return http.createServer(requestHandler).listen(...args);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  app.listen(port, () => {
    console.log(`Northweld Games website running on http://localhost:${port}`);
  });
}

export { app, createDiscordPayload, validateApplication };
export default app;
