# Northweld Games website

Official Northweld Games studio website with a secure Discord application form.

## Quick preview

Open `OPEN-ME.html` to preview the complete design without installing anything. Its CSS, JavaScript and images are embedded directly in the HTML file.

The preview cannot send applications. Follow the local setup steps below to run the secure Discord application form.

## Requirements

- Node.js 20 or newer
- A private Discord webhook for the recruitment channel
- Vercel, Railway, Render, or another Node.js host for live submissions

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. On Windows, run `SET-WEBHOOK-WINDOWS.bat` and paste the private recruitment webhook. You can also create a private `.env` file manually:

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

### Vercel

1. Deploy the complete project folder, not only the `public` folder.
2. In the Vercel project, open **Settings → Environment Variables**.
3. Add `DISCORD_WEBHOOK_URL` and paste the private recruitment webhook as its value.
4. Enable the variable for Production, Preview and Development.
5. Redeploy the project after saving the variable.
6. Open `/api/health` on the deployed domain and confirm that `applicationsConfigured` is `true`.

Vercel uses the dedicated `api/apply.js` function for application delivery. Static files remain inside `public/`. The local Express server remains available through `npm start`.

### Other Node.js hosts

Deploy the complete folder to a Node.js host such as Railway, Render or a VPS. Set `DISCORD_WEBHOOK_URL` as a private environment variable and use `npm start` as the start command.

Do not deploy only the `public` folder because the application endpoint requires `server.js`.

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
- Local application delivery: `server.js`
- Vercel application delivery: `api/apply.js`
- Shared validation and Discord payload: `lib/application.js`
- Logo files: `public/assets/`


## Recruitment categories

The application form includes a dedicated **Concept Artist** category for character, environment, prop and mood-development work.
