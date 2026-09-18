# SpeakCraft — deployable version (100% free to run)

This is the standalone, deployable version of the SpeakCraft/Igris speaking
coach, wired to run at **$0/month**:

- **Hosting:** Render's free web service plan.
- **AI model:** Google's Gemini API free tier (Flash model) — no credit
  card required, no ongoing charge.

It's split into two parts because an API key can never sit inside frontend
code where anyone can see it in their browser's dev tools:

- `client/` — the React app (the coach itself, the Saturn visual, everything
  you already saw in Claude).
- `server.js` — a tiny Express server. It holds your Gemini API key and
  forwards requests on the app's behalf, and also serves the built
  frontend once deployed.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account.
3. Click **Create API key**. No credit card, no billing setup needed for
   the free tier.
4. Copy the key somewhere safe — you'll paste it into Render as an
   environment variable, never into the code itself.

The free tier gives you roughly 15 requests/minute and ~1,500 requests/day
on the Flash model — one person practicing daily uses a tiny fraction of
that.

## 2. Test it on your laptop first

You'll need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
# from this folder
npm install
```

Now set your key. The easiest way — do this once and forget it — is to
create a file named `.env` in this same folder (copy `.env.example` and
rename it) containing:

```
GEMINI_API_KEY=paste_your_real_key_here
```

The server loads this automatically every time it starts, so you never
have to re-type the key in a terminal again.

(If you'd rather set it directly in your terminal instead of a `.env`
file, the command depends on your shell — this trips people up constantly,
so use the right one:
- **PowerShell** (VS Code's default on Windows): `$env:GEMINI_API_KEY = "AIzaSy..."`
- **Command Prompt (cmd.exe)**: `set GEMINI_API_KEY=AIzaSy...`
- **Mac/Linux/Git Bash**: `export GEMINI_API_KEY=AIzaSy...`
Note that `set` only works in cmd.exe — typing it in PowerShell silently
does nothing useful, which is a very easy mistake to make. The `.env` file
avoids this problem entirely, so it's the recommended way.)

Then build and run:

```bash
npm run build
npm start
```

Then open http://localhost:3000 — that's the whole app running for real,
for free.

(For fast-refresh while editing, run the client and server separately in
two terminals: `npm start` in this folder, and `npm run dev` inside
`client/` — the Vite dev server proxies `/api` calls to your local server
automatically.)

## 3. Push it to GitHub

Render deploys from a Git repository, so yes — GitHub first. From this
folder:

```bash
git init
git add .
git commit -m "SpeakCraft deployable version"
```

Create a new, empty repository on GitHub (github.com → New repository —
don't add a README there, you already have one), then push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## 4. Deploy on Render (free plan)

1. Go to https://dashboard.render.com and sign in — you can use your
   GitHub account directly.
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if you haven't, and pick the repo you just
   pushed.
4. Render should auto-detect the settings from `render.yaml` (free plan
   included). If it asks manually:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = the key you got in step 1
6. Click **Create Web Service**. The first build takes a few minutes.

Once it's live, Render gives you a permanent URL like
`https://speakcraft.onrender.com` — free, no card on file, no recurring
charge from either Render or Google for this scale of personal use.

## Notes on staying free

- **Render free plan**: the server spins down after ~15 minutes of no
  traffic, so the very first request after a while takes 30–60 seconds to
  wake up. Totally normal — just a free-tier trade-off, not a bug.
- **Gemini free tier**: Google renames or retires free models fairly
  often (this happened once already — the app was originally built on
  `gemini-1.5-flash`, which Google fully shut down). The current default
  is `gemini-3.1-flash-lite` in `server.js`. If requests ever start
  failing with a 404 again, check
  https://ai.google.dev/gemini-api/docs/models for the current free
  Flash model, and either edit the `MODEL` constant in `server.js`, or
  set `GEMINI_MODEL=whatever-the-new-name-is` in your `.env` file (or as
  a Render environment variable) — no code changes needed for that path.
- Every visitor's streak/vocab/mistakes are stored in *their own browser*
  (localStorage) — no database, no shared account system, nothing else
  that could ever cost money.
- If you ever want the sharper, more reliable JSON-following behavior of
  Claude instead of Gemini, you can point `server.js` back at Anthropic's
  API — but that one is pay-per-use, so it's not part of the free setup
  by default.
