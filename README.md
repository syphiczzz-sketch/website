# Northweld Games website

Official Northweld Games studio website with a secure Discord application form.

## Quick preview

Open `OPEN-ME.html` to preview the complete design without installing anything. Its CSS, JavaScript and images are embedded directly in the HTML file.

The preview cannot send applications. Follow the local setup steps below to run the secure Discord application form.

## Requirements

- Node.js 20 or newer
- A private Discord webhook for the recruitment channel

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a private `.env` file or configure environment variables through your hosting provider:

   ```env
   DISCORD_WEBHOOK_URL=your-private-discord-webhook
   PORT=3000
   TRUST_PROXY=true
   ```

3. Start the website:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000`.

## Deployment

Deploy the complete folder to a Node.js host such as Railway, Render or a VPS. Set the following private environment variable in the host dashboard:

- `DISCORD_WEBHOOK_URL`

Use `npm start` as the start command. Do not deploy only the `public` folder because the secure application endpoint requires `server.js`.

## Security

- The Discord webhook is never sent to the browser.
- Application fields are validated on the server.
- Discord mentions are disabled in application messages.
- A honeypot and per-IP submission limit reduce automated spam.
- Security and content policy headers are included.
- `.env` files are excluded from Git.

## Editing the site

- Main content: `public/index.html`
- Visual design: `public/styles.css`
- Browser behaviour: `public/app.js`
- Application delivery: `server.js`
- Logo files: `public/assets/`
