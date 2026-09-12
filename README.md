# The Builders

Landing page for The Builders — an innovation and technology community for students at JESS Arabian Ranches, Dubai.

Built with React, Tailwind CSS v4, and GSAP (ScrollTrigger).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Push this repo to GitHub and import it on [Vercel](https://vercel.com/new) — it's a standard Vite app, so no configuration is needed. Build command `npm run build`, output directory `dist`.

## Before going live

Update `FORM_ENDPOINT` in [src/components/Join.jsx](src/components/Join.jsx) with your deployed Google Apps Script web app URL so the join form actually submits.
