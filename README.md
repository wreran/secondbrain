# Second Brain

Second Brain is a Next.js app for turning live discussions into a visual idea graph. It combines transcript capture, AI-assisted node generation, pressure-testing prompts, and session reports in a single workspace.

## Features

- Live session workspace with transcript capture and node graph editing
- AI idea evaluation that turns strong transcript entries into nodes
- Pressure-test mode for challenging ideas with critique prompts
- Session analysis and report generation
- Optional speaker enrollment and diarization through a separate Python service

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- `@xyflow/react` for the graph canvas
- `three` / `@react-three/fiber` for visual effects

## Project Structure

```text
app/               Next.js routes, pages, and API handlers
components/        UI and workspace components
lib/               Workspace state, analysis, and helper logic
types/             Shared TypeScript types
speaker-service/   Optional Python diarization backend
```

## Routes

- `/` landing page
- `/session` live idea-mapping workspace
- `/challenge` pressure-test overview
- `/project` project view
- `/report` generated report view
- `/dashboard` workspace dashboard

## Environment

Copy `.env.example` to `.env.local` and fill in the values you need:

```env
AGNES_API_URL=https://apihub.agnes-ai.com/v1
AGNES_API_KEY=your_real_key
AGNES_MODEL=agnes-2.0-flash
DIARIZATION_API_URL=
DIARIZATION_ENROLL_URL=
DIARIZATION_API_KEY=
```

Notes:

- `AGNES_*` powers transcript analysis, challenge prompts, and idea evaluation.
- `DIARIZATION_*` is optional. Leave it blank if you do not want speaker diarization.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Available Scripts

- `npm run dev` starts the local dev server
- `npm run build` builds the production app
- `npm run start` runs the production build
- `npm run lint` runs ESLint

## Speaker Service

The optional speaker service lives in [speaker-service/README.md]. It exposes:

- `GET /health`
- `POST /enroll`
- `POST /diarize`

Use it when you want speaker enrollment and diarization on recorded meeting audio.

## Development Notes

- This repo uses a newer Next.js version than many older examples. Follow the local guidance in `AGENTS.md` and check `node_modules/next/dist/docs/` when framework behavior is unclear.
- The speaker-service is optional and has a separate dependency stack from the main app.
- Workspace state is stored client-side and updated through helpers in `lib/workspace-store.ts`.
