# Nova — personal context app

Nova is a Russian-language, user-owned personal assistant prototype. It starts with a real onboarding flow: there are no pre-filled names, metrics, courses, schedules, readiness values or hidden demo records.

## What works now

- Registration asks for the user's name, age, profession, target, current level, interests, learning goal, work schedule, sleep schedule, training days and preferred coaching tone.
- The dashboard is empty until the user adds data.
- Manual health records support date, sleep, resting heart rate, HRV, steps, training load, readiness and context notes.
- Garmin JSON / CSV import works without external credentials. Imported values keep a `Garmin-файл` source label.
- Garmin Connect OAuth 2.0 + PKCE flow is wired in the Vite server plugin. After a Garmin Developer Program app is approved and configured, the app can exchange tokens and sync daily summaries, sleep and HRV from the Wellness API.
- AI analysis is a server-side endpoint. It sends only the saved profile, notes and health records to the configured provider and explicitly instructs the model not to invent missing measurements or medical conclusions.
- Every value shown in the interface carries a source label: `Garmin API`, `Garmin-файл` or `Ручной ввод`.
- The app can delete all local profile, notes, imported data and analysis from the browser.

## Run locally

```bash
npm install
npm run dev
```

The Vite dev server binds to `0.0.0.0` and includes the local `/api` middleware used by Garmin and AI actions.

## Enable real Garmin sync

Garmin access is not a public personal API. You need access to the Garmin Connect Developer Program and an approved application. Configure the redirect URI for the environment where Nova runs:

```text
https://YOUR_PUBLIC_HOST/api/garmin/callback
```

Then copy `.env.example` to `.env` and set:

```text
GARMIN_CLIENT_ID=...
GARMIN_CLIENT_SECRET=...
```

The backend keeps tokens out of the browser. The included dev middleware stores the connection in memory for the current server process; a production deployment must move tokens to encrypted server-side storage tied to a user account.

## Enable AI analysis

Set a server-side provider key:

```text
OPENAI_API_KEY=...
# optional: AI_API_URL=...
# optional: AI_MODEL=...
```

Without a key the app shows a clear setup message and does not fabricate analysis. Production should add authentication, encrypted storage, consent management and a database before processing personal health data.

## Build

```bash
npm run build
```
