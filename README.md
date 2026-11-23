# QR Contacts

A Progressive Web App that turns contact details into a QR code. Anyone who scans it with a phone camera can save the contact straight to their phone (iOS and Android).

## Features

- **vCard 3.0 QR codes**: name and mobile number are required. Email, work phone, company, job title, website, address and note are optional.
- **Show or hide** the name, phone number, position, unit and department under the QR code, or show the QR code alone. Position, unit and department are printed on the label only and are not stored in the QR code.
- **Print** at small (3.5 cm), medium (5.5 cm) or large (9 cm) size on any printer the device can reach.
- **Download as PNG**, or **share** it with the native share sheet on mobile. Sharing attaches a `.vcf` contact file next to the image where the platform allows it, so the receiver can add the contact with one tap. Nothing is uploaded.
- **Installable PWA** that works offline after the first visit.
- Light and dark themes. The last contact is kept in `localStorage`, and no data leaves the browser.

Built with Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui (Base UI) and `qrcode.react`.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production build (the service worker only registers in production)
```

Regenerate the app icons after changing `scripts/generate-icons.mjs`:

```bash
node scripts/generate-icons.mjs
```

## Deploy

Import the GitHub repository at <https://vercel.com/new>. Vercel detects Next.js automatically, so no extra configuration is needed. Every push to `main` deploys again.
