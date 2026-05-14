# Corocat Static Deploy

This folder is a static deploy package for the Corocat landing page.

Upload the contents of this `deploy` folder to any static host, for example Netlify, Cloudflare Pages, GitHub Pages, cPanel, Apache, or Nginx.

Files:

- `index.html` - the page markup
- `styles.css` - all page styling
- `script.js` - mobile menu, reveal animations, carousel controls
- `assets/` - images, favicon, and video
- `site.webmanifest`, `robots.txt`, `sitemap.xml` - deploy metadata

Important:

The full app in the project root is a Next.js app with server features such as auth, AI generation, Stripe, API routes, and Firebase admin code. Those features need a Next.js host such as Vercel. This static folder is meant for a standalone marketing/landing page.

Before going live:

1. Replace `https://example.com/` in `sitemap.xml` with your real domain.
2. Replace the CTA email in `index.html` if needed.
3. Connect buttons to your live app routes if you deploy the full Next.js app separately.
