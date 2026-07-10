import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const currentFile = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFile);
const publicDirectory = path.join(__dirname, "public");
const app = express();
const port = Number(process.env.PORT || 3000);

const roleOptions = new Set([
  "Lead Programmer / Technical Director",
  "Gameplay Programmer",
  "Systems and AI Programmer",
  "Game and Level Designer",
  "Narrative Designer / Writer",
  "2D Pixel Artist",
  "UI / UX Designer",
  "Technical Artist / VFX Artist",
  "Sound Designer / Composer",
  "Producer / QA Tester",
  "Community and Marketing"
]);

const experienceOptions = new Set([
  "Newcomer with completed personal work",
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "More than 5 years"
]);

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

function cleanText(value, maximumLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maximumLength);
}

function isValidPortfolioUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getWebhookUrl() {
  const value = process.env.DISCORD_WEBHOOK_URL;
  if (!value) return null;

  try {
    const webhookUrl = new URL(value);
    const isDiscordHost = [
      "discord.com",
      "canary.discord.com",
      "ptb.discord.com"
    ].includes(webhookUrl.hostname);
    const isWebhookPath = webhookUrl.pathname.startsWith("/api/webhooks/");
    const allowLocalTest =
      process.env.NODE_ENV === "test" &&
      ["127.0.0.1", "localhost"].includes(webhookUrl.hostname);

    if ((!isDiscordHost || !isWebhookPath) && !allowLocalTest) return null;
    webhookUrl.searchParams.set("wait", "true");
    return webhookUrl.toString();
  } catch {
    return null;
  }
}

function validateApplication(body) {
  const application = {
    handle: cleanText(body.handle, 80),
    discord: cleanText(body.discord, 80),
    timezone: cleanText(body.timezone, 80),
    role: cleanText(body.role, 100),
    experience: cleanText(body.experience, 80),
    tools: cleanText(body.tools, 700),
    portfolio: cleanText(body.portfolio, 300),
    hours: Number(body.hours),
    contribution: cleanText(body.contribution, 900),
    motivation: cleanText(body.motivation, 900),
    ageConfirmed: body.ageConfirmed === true,
    compensationAccepted: body.compensationAccepted === true,
    originalWorkAccepted: body.originalWorkAccepted === true,
    privacyAccepted: body.privacyAccepted === true,
    company: cleanText(body.company, 120)
  };

  if (application.company) return { honeypot: true };

  const requiredText = [
    application.handle,
    application.discord,
    application.timezone,
    application.tools,
    application.contribution,
    application.motivation
  ];

  if (requiredText.some((value) => value.length < 2)) {
    return { error: "Please complete every required field." };
  }

  if (!roleOptions.has(application.role)) {
    return { error: "Please select a valid role." };
  }

  if (!experienceOptions.has(application.experience)) {
    return { error: "Please select a valid experience level." };
  }

  if (!Number.isFinite(application.hours) || application.hours < 2 || application.hours > 40) {
    return { error: "Weekly availability must be between 2 and 40 hours." };
  }

  if (!isValidPortfolioUrl(application.portfolio)) {
    return { error: "Portfolio must be a valid web address." };
  }

  if (
    !application.ageConfirmed ||
    !application.compensationAccepted ||
    !application.originalWorkAccepted ||
    !application.privacyAccepted
  ) {
    return { error: "Please accept every required confirmation." };
  }

  return { application };
}

function createDiscordPayload(application, applicationId) {
  const portfolio = application.portfolio || "Not provided";

  return {
    username: "Northweld Applications",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "New team application",
        description: `Application ID: \`${applicationId}\``,
        color: 0x5d83ad,
        fields: [
          {
            name: "Applicant",
            value: `**Name:** ${application.handle}\n**Discord:** ${application.discord}`,
            inline: true
          },
          {
            name: "Location",
            value: application.timezone,
            inline: true
          },
          {
            name: "Preferred role",
            value: application.role,
            inline: false
          },
          {
            name: "Experience",
            value: application.experience,
            inline: true
          },
          {
            name: "Availability",
            value: `${application.hours} hours per week`,
            inline: true
          },
          {
            name: "Tools and skills",
            value: application.tools,
            inline: false
          },
          {
            name: "Portfolio",
            value: portfolio,
            inline: false
          },
          {
            name: "Proposed contribution",
            value: application.contribution,
            inline: false
          },
          {
            name: "Motivation",
            value: application.motivation,
            inline: false
          },
          {
            name: "Confirmations",
            value:
              "18+ confirmed · Revenue share accepted · Original work confirmed · Privacy terms accepted",
            inline: false
          }
        ],
        footer: { text: "Northweld Games recruitment" },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/apply", async (request, response) => {
  const result = validateApplication(request.body || {});

  if (result.honeypot) {
    return response.status(200).json({ ok: true });
  }

  if (result.error) {
    return response.status(400).json({ ok: false, error: result.error });
  }

  if (isRateLimited(request.ip || "unknown")) {
    return response.status(429).json({
      ok: false,
      error: "Too many applications were submitted. Please try again later."
    });
  }

  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return response.status(503).json({
      ok: false,
      error: "Applications are temporarily unavailable. Please try again later."
    });
  }

  const applicationId = crypto.randomUUID().split("-")[0].toUpperCase();
  const payload = createDiscordPayload(result.application, applicationId);

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    });

    if (!discordResponse.ok) {
      console.error("Discord application delivery failed with status", discordResponse.status);
      return response.status(502).json({
        ok: false,
        error: "The application could not be delivered. Please try again."
      });
    }

    return response.status(201).json({ ok: true, applicationId });
  } catch (error) {
    console.error("Discord application delivery failed", error.name);
    return response.status(502).json({
      ok: false,
      error: "The application could not be delivered. Please try again."
    });
  }
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
