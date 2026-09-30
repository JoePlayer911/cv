# Personal Portfolio & Web Projects

ENGLISH | [简体中文](README_CN.md)

Welcome to my personal portfolio repository! This project serves as a showcase of my web development skills, featuring a sleek, modern landing page alongside a collection of interactive, competitive vocabulary games and AI integrations.

## Features

- **Modern UI/UX:** A responsive, glassmorphism-inspired landing page (`index.html`) with smooth scroll animations powered by Intersection Observer.
- **Vanilla Tech Stack:** Built primarily with HTML5, CSS3 Custom Properties, and Vanilla JavaScript — no build step required for any page in this repo.
- **Zero-secret architecture:** Vocabulary is pulled from Google Sheets via their public, keyless CSV export (no API key exists anywhere in this codebase), and AI features use a free keyless LLM proxy. The only optional secrets (an ElevenLabs voice key, a personal LLM7 key) are "bring your own key" — pasted by each visitor into their own browser, stored only in their own `localStorage`, and never seen by this site.
- **Serverless leaderboards & duels:** optional Firebase (Firestore + anonymous auth) powers cross-device daily leaderboards, secured by `firestore.rules` rather than a hidden key. Live 1v1 duels need no setup at all: they connect browser-to-browser over WebRTC via PeerJS's free public broker, with an offline bot opponent as a fallback — see [Firebase setup](#firebase-setup-for-leaderboards--duels) below.
- **AI Integrations:** LLM-generated content (boss riddles) via a keyless proxy, plus a Live2D avatar demo with optional ElevenLabs TTS.

## Included Projects

Accessible from the Projects section of the main page (`index.html`):

1. **Word Dragon 字龙** — snake reimagined as a dragon that must eat characters in the right order to spell each word, dodging decoys.
2. **Night Market 夜市** — a 7-night street-food stall management game where customers order by meaning, pinyin, or out loud and every dish is a word.
3. **Hanzidle** — a Wordle-style daily vocabulary deduction puzzle with a shared daily leaderboard.
4. **Vocab Duel Arena** — live 1v1 vocabulary battles over a room code.
5. **Vocab Royale: Survival Arena** — a canvas typing-survival game with escalating waves and AI-riddled boss fights.
6. **Memory Grid Speedrun** — a timed, daily-seeded memory-match game.
7. **Live2D + AI Voice Demo** — an interactive Live2D avatar hooked up to an LLM and (optionally, with your own key) the ElevenLabs Voice API (`gemini.html`).

Older, retired game pages (including Story Forge, parked for now) live in `old/` (gitignored — kept locally for reference, not published).

## Use Your Own Word List

Every game reads its vocabulary from a Google Sheet: **column A = Chinese, column B = pinyin (tone marks or numbers), column C = meaning**. A header row is optional.

1. Share the sheet as **Anyone with the link → Viewer**.
2. In any game's level picker choose **➕ Use my own Google Sheet link…** and paste the sheet's URL. The tab in the link (`#gid=…`) is the one that gets used.
3. The list is saved in your browser and becomes the active word list for every game. Adding `?sheet=<sheet link>&name=<label>` to any game's URL loads that list for whoever opens it — handy for a class.

Progress (a per-word Leitner box, stored in `localStorage`) is shared across all games, so words you miss show up more often.

## Running Locally

This is a fully static site — any static file server works. From the repo root:

```bash
python -m http.server 8000
# or
npx serve .
```

Then open `http://127.0.0.1:8000/`.

## Firebase Setup (for leaderboards)

The games work fully offline/without Firebase — vocabulary fetching, the LLM features, and single-player scoring all degrade gracefully. Leaderboards simply stay hidden until you configure a free Firebase project:

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a new project (or reuse an existing one).
2. **Build → Firestore Database → Create database** → start in production mode → pick a region.
3. **Build → Authentication → Get started** → enable the **Anonymous** sign-in provider (no email/password needed — it just gives each visitor a stable id).
4. **Project settings (gear icon) → General → Your apps** → click the Web icon (`</>`) → register an app (no Firebase Hosting needed) → copy the shown `firebaseConfig` object.
5. Paste those values into the `firebaseConfig` object at the top of [`firebase-client.js`](firebase-client.js) (this config is not a secret — Firebase web apps are protected by security rules, not by hiding it).
6. Paste the contents of [`firestore.rules`](firestore.rules) into **Firestore Database → Rules** in the console (or deploy it with the Firebase CLI: `firebase deploy --only firestore:rules`).

That's it — reload any game and the leaderboard UI will light up automatically.

## License

This project is intended as a personal portfolio. The underlying Live2D models belong to their respective creators and are subject to the [Live2D Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).
