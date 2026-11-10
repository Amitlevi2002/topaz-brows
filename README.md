# Topaz Mudahi Eyebrows

A booking site and studio system for Topaz, who shapes and restores natural brows. Clients see her before-and-after work, put their treatment together with the price as they go, and ask for a time from their phone. Topaz approves, reschedules or declines, and keeps track of her clients and her month, all from her own phone.

It is built on the same booking system as [Nails by Lee](https://github.com/Amitlevi2002/nails-by-lee), with its own front page, brand and price list.

The interface is in Hebrew (right-to-left), with an English switch, built for phones first.

## What it does

**For clients**
- The front page is in the colours of her logo, beige and gold, with no blocks between sections: her logo on the first screen with a light passing over the gold, an animation on one face (an AI illustration Amit made, marked as one on the page and in the terms) where the brows change from untouched to shaped in place, and a swipe strip of her work. Scrolling is the browser's own; sections rise into view with GSAP (`web/src/client/motion.ts`), and with reduced motion nothing moves
- Build a treatment on the price list: pick a treatment and extras (moustache, nose, tint, sideburns) and the total updates. A bar with the total floats at the bottom, and the choice is already selected when she reaches the treatment step of the booking
- The nearest free time is shown on the front page, before signing in
- Sign in with name and phone number (no passwords to forget)
- Pick a day and time from what Topaz opened, then confirm
- See upcoming appointments, cancel up to N hours before (Topaz sets N), or join a waitlist

**For Topaz**
- Requests waiting for approval; approve, decline or offer another time
- Warns before approving two clients for the same slot
- Month calendar: open days and set the hours for each
- Book a client by hand (for people who still call)
- Client cards with history, notes, visits, money spent, cancellations and no-shows
- "Time to come back": regulars with nothing booked three weeks after their last visit
- Ready-made WhatsApp messages that open in WhatsApp for her to send
- This month's income by treatment
- Edit prices and extras, upload photos, choose whether requests need approval

## Prices

The price list Topaz gave is stored as treatments plus flat extras, so her combined prices come out exactly: brow shaping 60, with moustache 70, with moustache and nose 75; brow lift 180, with moustache 190. The tests check these numbers.

## Accessibility, languages and legal pages

Every page has an accessibility menu (text size, high contrast, highlighted links, readable font, stopped animations, grayscale), a skip link and full keyboard use, built toward Israeli Standard 5568 (WCAG 2.0 AA). The screens were checked with axe. A button switches between Hebrew and English, including the page direction, and there are privacy, terms and accessibility statement pages (`web/public/site-kit.js`, `web/public/site-i18n.js`).

## How it's built

```
core/     booking rules: one function, (state, request) -> response. No I/O.
web/      React + TypeScript (Vite). Talks to the API, or runs core/ in the browser for the demo.
server/   Express + SQLite (node:sqlite). Runs the same core/ behind real auth.
```

All the rules (which slots are free, who can cancel when, what counts toward this month's income) live in `core/handler.ts`, a pure function with no database or HTTP in it. The server wraps it with authentication and persistence, and the demo wraps it with localStorage, so both run the same rules and the tests exercise them directly.

Logins are signed tokens (HMAC-SHA256 with an expiry), the admin password comes from an environment variable and is compared in constant time, admin login is rate limited, and writes are saved all-or-nothing. Times are Israel time wherever the server runs.

## Running it

Node 22.13 or newer.

```bash
# demo: the web app alone, on sample data
cd web && npm install && npm run dev

# real setup
cd server && npm install
cp .env.example .env            # set ADMIN_PASSWORD and SESSION_SECRET
cd ../web && npm install && npm run build:server
cd ../server && npm start       # clients at /, Topaz at /admin
```

Tests: `cd server && npm test` (booking rules, tokens, storage) and `cd web && npm test` (prices).
