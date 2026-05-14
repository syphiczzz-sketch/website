# Corocat Static Deploy

This folder is a static deploy package for Corocat.

Upload the contents of this `deploy` folder to any static host, for example Netlify, Cloudflare Pages, GitHub Pages, cPanel, Apache, or Nginx.

Files:

- `index.html` - the page markup
- `styles.css` - all page styling
- `script.js` - mobile menu, reveal animations, carousel controls
- `login.html`, `signup.html`, `forgot-password.html`, `verify-email.html` - auth screens
- `learn.html`, `course-generation.html`, `whiteboard.html`, `enterprise.html`, `profile.html` - static app previews
- `terms.html`, `privacy.html` - legal pages
- `assets/` - images, favicon, and video
- `site.webmanifest`, `robots.txt`, `sitemap.xml` - deploy metadata

Important:

The full app in the project root is a Next.js app with server features such as auth, AI generation, Stripe, API routes, Liveblocks, and Firebase admin code. Those features need a Next.js host such as Vercel. This static folder includes deployable static pages and client-side demos/placeholders for the server-backed flows.

Before going live:

1. Replace `https://example.com/` in `sitemap.xml` with your real domain.
2. Connect forms to your real backend, or point CTA buttons to the full Next.js app if you deploy it separately.
3. Replace preview/sample content with production copy where needed.
