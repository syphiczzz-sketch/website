import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { app, createDiscordPayload, validateApplication } from "../server.js";

function validApplication(overrides = {}) {
  return {
    handle: "Test Developer",
    discord: "testdeveloper",
    timezone: "Estonia, UTC+3",
    role: "Gameplay Programmer",
    experience: "1 to 2 years",
    tools: "Godot 4, GDScript and Git",
    portfolio: "https://example.com/portfolio",
    hours: 8,
    contribution: "I can implement the core editorial loop and data tools.",
    motivation: "I want to ship a focused commercial game with a reliable team.",
    ageConfirmed: true,
    compensationAccepted: true,
    originalWorkAccepted: true,
    privacyAccepted: true,
    company: "",
    ...overrides
  };
}

test("accepts a complete application", () => {
  const result = validateApplication(validApplication());
  assert.ok(result.application);
  assert.equal(result.application.role, "Gameplay Programmer");
});

test("rejects invalid weekly availability", () => {
  const result = validateApplication(validApplication({ hours: 50 }));
  assert.match(result.error, /between 2 and 40/i);
});

test("rejects an unsupported portfolio protocol", () => {
  const result = validateApplication(
    validApplication({ portfolio: "javascript:alert(1)" })
  );
  assert.match(result.error, /valid web address/i);
});

test("treats a completed honeypot as automated submission", () => {
  const result = validateApplication(validApplication({ company: "Spam Ltd" }));
  assert.equal(result.honeypot, true);
});

test("creates a Discord payload without enabled mentions", () => {
  const result = validateApplication(validApplication());
  const payload = createDiscordPayload(result.application, "ABC12345");
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.equal(payload.embeds[0].title, "New team application");
  assert.match(payload.embeds[0].description, /ABC12345/);
});

test("serves the website and health endpoint", async (context) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
  const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
  const page = await pageResponse.text();

  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { ok: true });
  assert.equal(pageResponse.status, 200);
  assert.match(page, /Taskbar Times: 1995/);
  assert.match(page, /id="application-form"/);
});

test("delivers a valid application to the configured webhook", async (context) => {
  let receivedPayload;
  const mockWebhook = http.createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      receivedPayload = JSON.parse(body);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
    });
  });

  mockWebhook.listen(0, "127.0.0.1");
  await new Promise((resolve) => mockWebhook.once("listening", resolve));
  context.after(() => new Promise((resolve) => mockWebhook.close(resolve)));

  const appServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => appServer.once("listening", resolve));
  context.after(() => new Promise((resolve) => appServer.close(resolve)));

  const previousEnvironment = process.env.NODE_ENV;
  const previousWebhook = process.env.DISCORD_WEBHOOK_URL;
  process.env.NODE_ENV = "test";
  process.env.DISCORD_WEBHOOK_URL = `http://127.0.0.1:${mockWebhook.address().port}/webhook`;
  context.after(() => {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousWebhook === undefined) delete process.env.DISCORD_WEBHOOK_URL;
    else process.env.DISCORD_WEBHOOK_URL = previousWebhook;
  });

  const response = await fetch(
    `http://127.0.0.1:${appServer.address().port}/api/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validApplication())
    }
  );
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.match(result.applicationId, /^[A-F0-9]{8}$/);
  assert.equal(receivedPayload.embeds[0].title, "New team application");
  assert.deepEqual(receivedPayload.allowed_mentions, { parse: [] });
});
