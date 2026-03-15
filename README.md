# ThoughtLens.ai

ThoughtLens.ai is a Next.js + TypeScript app for structured CBT-style thought reflection.

It helps users break one thought into:
- situation (what happened)
- story (what the mind concluded)
- emotion
- thinking pattern
- clearer perspective
- possible next thought directions

## What the app currently includes

- Marketing pages:
  - `/` (`app/page.tsx`)
  - `/tool` (`app/tool/page.tsx`)
- Core API:
  - `POST /api/process-thought` (`app/api/process-thought/route.ts`)
- AI stage engine:
  - `lib/ai.ts`
- Persistence:
  - Prisma + PostgreSQL (`prisma/schema.prisma`)
- Thread insights:
  - dominant pattern/emotion/belief per thread
- Test suites:
  - `tests/thoughtPipeline.test.ts`
  - `tests/reflectionPipeline.test.ts`
  - `tests/reflectionPipeline.e2e.test.ts`

## Tech stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Prisma 7 + PostgreSQL
- OpenAI SDK (`openai`)
- Tailwind CSS + Framer Motion
- Vitest

## Reflection pipeline (current behavior)

For each thought, the API builds this analysis flow:

1. `classifyInput`  
2. `fact_story` via `generateFactStoryStage`  
3. `story_emotion` via `generateStoryEmotionStage`  
4. `recognition`  
5. `pattern`  
6. `balanced`  
7. `next_thought`

### Important thread model

- Thread lifecycle is explicit:
  - no `threadId` in request -> backend creates new thread id
  - `threadId` provided -> backend appends to that thread
- The thread situation is persisted and reused.
- Story is treated as the current interpretation for that pass.

## API contract

### Endpoint

`POST /api/process-thought`

### Request body

```json
{
  "thought": "I might not hear back from the interview",
  "visitorId": "uuid",
  "sessionId": "uuid",
  "threadId": "uuid-optional",
  "threadTitle": "optional"
}
```

### Success response (shape)

```json
{
  "status": "success",
  "valid": true,
  "type": "analysis",
  "context": [],
  "analysis": {},
  "stages": {
    "factStory": {},
    "recognition": {},
    "pattern": {},
    "balanced": {},
    "nextThought": {}
  },
  "threadInsights": {},
  "threadReset": false,
  "threadId": "uuid"
}
```

### Non-success responses

- guidance response:
  - `status: "guidance"`
  - `valid: false`
  - `message`
- safety response:
  - `status: "safety"`
  - `valid: false`
  - `message`

## Data model overview

Defined in `prisma/schema.prisma`.

Main models:
- `Visitor`
- `Session`
- `Thread` (includes `situation`)
- `ThoughtEntry` (stores per-pass analysis fields)
- `ThreadInsight` (aggregate stats)

## Key files

- `app/api/process-thought/route.ts`  
  Request orchestration, stage execution, persistence, response merge.

- `lib/ai.ts`  
  Prompt templates, stage generators, pattern maps, fallback helpers.

- `services/reflectionValidator.service.ts`  
  Stage validation + fallback objects.

- `services/analysis.service.ts`  
  Merges stage outputs into stable `analysis` object for UI.

- `services/thought.service.ts` / `repositories/thought.repositories.ts`  
  Thread/thought persistence and retrieval.

- `services/threadInsight.service.ts`  
  Updates dominant pattern/emotion/belief.

## Local development

### 1) Install

```bash
npm install
```

### 2) Configure env

Create `.env.local` (or `.env`):

```bash
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_postgres_url
```

### 3) Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

If your DB already exists and you only need schema sync:

```bash
npx prisma db push
```

### 4) Run app

```bash
npm run dev
```

Open:
- `http://localhost:3000`
- `http://localhost:3000/tool`

## Build, lint, test

```bash
npm run lint
npm run build
```

Run tests:

```bash
npx vitest
```

## Deployment notes

- Railway logs like `INFO No package manager inferred, using npm default` are informational.
- Ensure deployment env has:
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
- Keep Prisma schema and DB migrations aligned before release.

## Current limitations to know

- AI stage quality depends on prompt reliability and model output consistency.
- Some fallbacks intentionally return safe generic responses when validation fails.
- Test files are excluded from production TypeScript build checks via `tsconfig.json` exclusions.

## License

Internal/private project unless specified otherwise.
