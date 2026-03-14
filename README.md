# ThoughtLens.ai - CBT Thought Reflection Engine

ThoughtLens.ai is a Next.js + TypeScript application that helps a user reflect on anxious or self-critical thoughts using a structured Cognitive Behavioral Therapy (CBT) pipeline.

The product separates:
- what happened (`situation`)
- what the mind made it mean (`story`)
- emotional and cognitive patterns
- a balanced perspective
- possible next automatic thoughts

The core architecture is built around multi-pass reflection on the **same situation**.

## Table of Contents
- [What This App Does](#what-this-app-does)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [End-to-End Request Flow](#end-to-end-request-flow)
- [AI Pipeline Stages](#ai-pipeline-stages)
- [Thread and Situation Persistence](#thread-and-situation-persistence)
- [API Contract](#api-contract)
- [Database Model](#database-model)
- [Validation and Safety](#validation-and-safety)
- [Suggestion Logic and Stop Conditions](#suggestion-logic-and-stop-conditions)
- [Thread Insight Aggregation](#thread-insight-aggregation)
- [Setup and Local Development](#setup-and-local-development)
- [Testing](#testing)
- [Debugging Guide](#debugging-guide)
- [Common Failure Modes and Fixes](#common-failure-modes-and-fixes)
- [Production Notes](#production-notes)

## What This App Does
The app is designed for reflective thought processing, not advice-giving.

Given a user thought such as:

> "It has been 3 days since my interviews and I have not heard back. I think I was not selected."

the system returns:
- `situation`: a factual event statement
- `story`: interpretation/conclusion
- `emotion`: inferred or AI-generated feeling
- `pattern`: cognitive distortion label
- `balancedThought`: realistic reframing
- `suggestions`: possible next automatic thoughts (when applicable)
- `threadInsights`: dominant pattern/emotion over the thread

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **AI**: OpenAI Chat Completions (`gpt-4o-mini`)
- **Database**: PostgreSQL (via Prisma)
- **ORM**: Prisma Client
- **Testing**: Vitest
- **UI**: React + Tailwind + Framer Motion

## Project Structure
Key paths:

- `app/api/process-thought/route.ts`: main API endpoint and orchestrator used by the tool
- `lib/ai.ts`: AI prompts, stage generators, rule-based overrides, suggestion validation
- `services/thought.service.ts`: thread/session/visitor and thought persistence helpers
- `repositories/thought.repositories.ts`: Prisma data access layer
- `services/threadInsight.service.ts`: dominant pattern/emotion/belief aggregation
- `services/reflectionValidator.service.ts`: stage-level validation + fallback strategy
- `services/analysis.service.ts`: normalized merged output shape returned to UI
- `services/cbt/stagePipeline.service.ts`: reusable stage pipeline builder (also used in tests)
- `schemas/thoughtStage.schema.ts`: Zod schemas for stage payloads
- `prisma/schema.prisma`: DB schema
- `tests/*.test.ts`: pipeline behavior tests

## End-to-End Request Flow
Main endpoint: `POST /api/process-thought`

High-level flow in `app/api/process-thought/route.ts`:

1. Validate payload (`thought`, `visitorId`, `sessionId`, `threadId` required).
2. Run self-harm detection.
3. Run lightweight input validation.
4. Run AI classification (`THOUGHT`, `SOLUTION_SEEKING`, etc.).
5. Convert classification to decision (`continue`, `guidance`, `safety`).
6. Load thread context and detect situation drift.
7. Ensure thread/session/visitor records exist (`ensureThreadContext`).
8. Ensure situation exists (extract only on first pass/new thread).
9. Generate/validate stages: fact_story -> recognition -> pattern -> balanced -> next_thought.
10. Apply distortion progression filtering to suggestions.
11. Merge stages into final `analysis` response.
12. Persist thought entry.
13. Recompute and persist thread insight.
14. Return stage payloads + merged analysis + thread insight.

## AI Pipeline Stages
Pipeline outputs are represented using `schemas/thoughtStage.schema.ts` and `services/reflectionValidator.service.ts` types.

### 1) Input Classification
Function: `classifyInput` in `lib/ai.ts`

Classifies incoming text into:
- `THOUGHT`
- `SELF_HARM_RISK`
- `SOLUTION_SEEKING`
- `SITUATION`
- `EMOTIONAL_EXPRESSION`
- `GENERAL_QUESTION`

### 2) Situation Extraction
Function: `extractSituation`

Extracts objective event-only context from thought text.

### 3) Fact/Story Stage
Function: `generateFactStoryStage`

Returns:
- `situation`: factual context
- `story`: interpretation only
- `emotions`: 1-3 short labels

Post-processing strips story/situation duplication and keeps interpretation-focused output.

### 4) Story+Emotion for Later Passes
Function: `generateStoryEmotionStage`

Used when a thread already has a situation. It should not regenerate or reinterpret the situation, only restate current interpretation + emotions.

### 5) Pattern Stage
Function: `generatePatternStage`

AI selects distortion label, then rule-based overrides (`detectPatternFromText`) can replace/strengthen model output.

### 6) Balanced Stage
Function: `generateBalancedStage`

Generates a grounded, situation-aware balanced thought.

### 7) Next Thought Stage
Function: `generateNextThoughtStage`

Generates possible next automatic thoughts, bounded by allowed distortions and thread context.

Also includes stop checks (loop stabilization, insight/core-belief detection).

### 8) Reflection Completion Check
Function: `generateReflectionCompletion`

AI returns `continue` or `complete` based on situation/story/pattern/history.

## Thread and Situation Persistence
The core stability invariant:

> A thread keeps one `situation`; each new pass only updates `story`/`emotion`/`pattern` around that same situation.

Persistence behavior:
- `Thread.situation` is the primary source.
- If `Thread.situation` is missing, `fetchThreadContext` can recover it from historic thought entries that have a `situation` value.
- Situation extraction should only happen at thread start (or after drift reset).

This prevents pass 2+ from turning a thought into "what happened".

## API Contract
Endpoint: `POST /api/process-thought`

Request body:

```json
{
  "thought": "...",
  "visitorId": "...",
  "sessionId": "...",
  "threadId": "...",
  "threadTitle": "optional"
}
```

Success response contains:
- `status: "success"`
- `valid: true`
- `analysis` (merged normalized payload)
- `stages` (`factStory`, `recognition`, `pattern`, `balanced`, `nextThought`)
- `threadInsights`
- `threadReset` (boolean)
- `threadId` (may be new if drift reset)

Guidance/safety response shape:
- `status: "guidance" | "safety"`
- `valid: false`
- `message`

## Database Model
Defined in `prisma/schema.prisma`.

Main entities:
- `Visitor`
- `Session`
- `Thread` (`situation` stored here)
- `ThoughtEntry` (per-pass analysis fields)
- `ThreadInsight` (aggregated dominance metrics)

Important fields:
- `Thread.situation` -> canonical thread event
- `ThoughtEntry.story`, `emotion`, `pattern`, `balancedThought`
- `ThoughtEntry.situation` -> also persisted per entry for audit/history

## Validation and Safety
Safety and validation layers:
- `services/safety.service.ts`: explicit self-harm phrase detection
- `services/validation.service.ts` + `lib/simpleValidation.ts`: basic input quality checks
- `services/reflectionValidator.service.ts`: retries invalid AI stage outputs and uses fallback payloads

## Suggestion Logic and Stop Conditions
Suggestion generation is constrained by:
- same-situation context block in prompts
- distortion progression map (`getAllowedDistortions`)
- explicit "no reassurance / no advice" rules

Suggestion suppression conditions:
- repeated/stabilized patterns
- detected user insight (`detectInsight`)
- detected core belief (`detectCoreBelief`)
- reflection completion stage

## Thread Insight Aggregation
`services/threadInsight.service.ts` computes:
- dominant pattern
- dominant emotion
- dominant belief
- thought count

and upserts this into `ThreadInsight` on each pass.

## Setup and Local Development
### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Environment variables
Create `.env.local` (or `.env`) with:

```bash
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgres_connection_string
```

### Install dependencies
```bash
npm install
```

### Prisma setup
```bash
npx prisma generate
npx prisma migrate dev
```

If you are syncing an existing DB and just need schema alignment:

```bash
npx prisma db push
```

### Run app
```bash
npm run dev
```

Open `http://localhost:3000`.

## Testing
Run all tests:

```bash
npx vitest
```

Run focused suites:

```bash
npx vitest run tests/reflectionPipeline.test.ts
npx vitest run tests/reflectionPipeline.e2e.test.ts
npx vitest run tests/thoughtPipeline.test.ts
```

Note: current e2e tests are pipeline-level and mock AI/database boundaries for determinism.

## Debugging Guide
If situation seems to drift between passes, debug in this order:

1. In `app/api/process-thought/route.ts`, verify `ensureThreadContext(...)` runs before analysis.
2. In `services/cbt/stagePipeline.service.ts`, inspect `thread.situation` immediately after `fetchThreadContext(threadId)`.
3. Confirm pass 1 sets situation and calls `updateThreadSituation(threadId, situation)`.
4. Confirm pass 2+ takes the story/emotion path, not fact/story regeneration path.
5. Verify DB `Thread.situation` for that `threadId`.
6. Check drift logic in route (`shouldResetThread`) did not intentionally create a new thread.

Helpful breakpoint points:
- `app/api/process-thought/route.ts` at `ensureThreadContext(...)`
- `app/api/process-thought/route.ts` around `shouldResetThread`
- `services/cbt/stagePipeline.service.ts` at `fetchThreadContext(...)`
- `services/cbt/stagePipeline.service.ts` before `factStoryStageSchema.parse(...)`

## Common Failure Modes and Fixes
1. `Thread.situation` always null
- Ensure migrations include `Thread.situation` column.
- Ensure thread row is created before first pass.
- Confirm `updateThreadSituation` succeeds.

2. Story repeats situation
- Verify `generateFactStoryStage` returns `situation` and `story` keys correctly.
- Check post-processing in `lib/ai.ts` that trims duplicated situation text.

3. Suggestions become generic/meta
- Inspect `generateNextThoughtStage` prompt rules.
- Ensure `validateThoughtSuggestions` is being called.

4. Reflection never completes
- Inspect `generateReflectionCompletion` decision path and history passed into it.

## Production Notes
- Run migrations before deploy so `Thread.situation` exists.
- Keep OpenAI key and DB URL configured in deployment secrets.
- Track rate limits and latency for stage-heavy flows.
- Consider structured logging around threadId/sessionId for easier incident tracing.

## License
Internal project. Add a formal license if distributing externally.
