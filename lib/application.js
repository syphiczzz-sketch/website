import crypto from "node:crypto";

export const roleOptions = new Set([
  "Lead Programmer / Technical Director",
  "Gameplay Programmer",
  "Systems and AI Programmer",
  "Game and Level Designer",
  "Narrative Designer / Writer",
  "Concept Artist",
  "2D Pixel Artist",
  "UI / UX Designer",
  "Technical Artist / VFX Artist",
  "Sound Designer / Composer",
  "Producer / QA Tester",
  "Community and Marketing"
]);

export const experienceOptions = new Set([
  "Newcomer with completed personal work",
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "More than 5 years"
]);

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

export function getWebhookUrl() {
  const value = process.env.DISCORD_WEBHOOK_URL;
  if (!value) return null;

  try {
    const webhookUrl = new URL(value.trim());
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

export function validateApplication(body = {}) {
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

export function createApplicationId() {
  return crypto.randomUUID().split("-")[0].toUpperCase();
}

export function createDiscordPayload(application, applicationId) {
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

export async function deliverApplication(application) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return {
      ok: false,
      status: 503,
      error:
        "Applications are not configured. Add DISCORD_WEBHOOK_URL in Vercel and redeploy."
    };
  }

  const applicationId = createApplicationId();
  const payload = createDiscordPayload(application, applicationId);

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    });

    if (!discordResponse.ok) {
      console.error("Discord application delivery failed with status", discordResponse.status);
      return {
        ok: false,
        status: 502,
        error: `Discord rejected the application delivery with status ${discordResponse.status}.`
      };
    }

    return { ok: true, status: 201, applicationId };
  } catch (error) {
    console.error("Discord application delivery failed", error?.name || "UnknownError");
    return {
      ok: false,
      status: 502,
      error: "The application could not reach Discord. Please try again."
    };
  }
}
