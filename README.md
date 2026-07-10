# Northweld Games website

Official Northweld Games studio website with a secure Discord application form.

## Quick preview

Open `OPEN-ME.html` to preview the complete design. Its CSS, JavaScript and images are embedded directly in the HTML file.

The standalone preview cannot submit applications. Run the local server or deploy the complete project to test the application form.

## Requirements

- Node.js 20
- A Discord webhook for the recruitment channel
- Vercel or another Node.js host for live submissions

The project has no external npm dependencies. It does not download Express, dotenv, or any other package during deployment.

## Local setup

1. On Windows, run `SET-WEBHOOK-WINDOWS.bat` and paste the recruitment webhook. You can also create a `.env` file manually:

   ```env
   DISCORD_WEBHOOK_URL=your-private-discord-webhook
   PORT=3000
   ```

2. Start the website:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000`.

Running `npm install` is not required because the project has no dependencies.

## Vercel deployment

1. Deploy the complete project folder, not only `public`, `index.html`, or `OPEN-ME.html`.
2. In Vercel, open **Settings → Environment Variables**.
3. Add `DISCORD_WEBHOOK_URL` and paste the recruitment webhook.
4. Enable it for Production, Preview and Development.
5. Redeploy without the old build cache if the previous deployment failed during dependency installation.
6. Open `https://YOUR-DOMAIN/api/health`.

The response should contain:

```json
{
  "ok": true,
  "applicationsConfigured": true,
  "endpoint": "/api/apply"
}
```

Vercel deploys `api/apply.js` and `api/health.js` as Node.js functions. These functions use only built-in Node.js and Web APIs.

## Other Node.js hosts

Deploy the complete folder. Set `DISCORD_WEBHOOK_URL` as a private environment variable and use `npm start` as the start command.

## Security

- The Discord webhook is not included in browser files.
- Application fields are validated on the server.
- Discord mentions are disabled.
- A honeypot and submission limit reduce spam.
- Security headers are included.
- `.env` files are excluded from Git.

## Editing the site

- Main content: `public/index.html`
- Visual design: `public/styles.css`
- Browser behaviour: `public/app.js`
- Vercel application endpoint: `api/apply.js`
- Shared application logic: `lib/application.js`
- Local Node.js server: `server.js`
- Logo files: `public/assets/`
