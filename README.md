# Digit Span Studio

A live code editor (left) next to the forward digit span game (right). Kids edit simple
lines like `monster.color = "hotpink"` and the game updates as they type.

Forked from `call-games-v1/02_pilot/digit-span 2/forward-digit-span.js`.

## Run locally

Requires Node.js. No `npm install` needed.

```bash
npm start
```

Open http://localhost:3000. The terminal also prints a `http://<ip>:3000` address that
other laptops on the same Wi-Fi can open.

Opening `index.html` directly (double-click) won't work: the game loads its SVGs with `fetch`,
which browsers block for `file://` pages.

## Deploy

Static site, no build step. This folder is linked to the Vercel project in `.vercel/`.

```bash
npx vercel --prod
```

## Files

| File | What it does |
| --- | --- |
| `index.html`, `studio.css`, `studio.js` | The editor: parsing, error messages, color palette |
| `studio-schema.js` | The only settings kids can change (add new ones here) |
| `studio-bridge.js`, `studio-overrides.css` | Game side: applies settings live |
| `game.html`, `game.js`, `game.css` | The digit span game (copy of the pilot version) |
| `vendor/jspsych/` | jsPsych 7 files the game uses |
| `public/` | Images and audio |

To add an editable setting: add it to `STUDIO_SCHEMA`, then either style it through its
`cssVar` in `studio-overrides.css` or read it in `game.js` through the `studio` object.
