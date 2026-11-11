# Handoff for Codex — Jaz! (Case 1 «Data-Driven Curriculum»)

Read this file fully, then `AGENTS.md`, `docs/CASE-ANALYSIS.md`, `docs/METHODIST-RESEARCH.md`, `DEPLOY.md`.

## 1. What the product is

An EdTech platform for **school methodists in Kazakhstan**. It turns СОР/СОЧ (summative assessment) results into decisions:
topic diagnostics → support groups → teaching-hour recommendations (КТП draft) → textbook comparison adjusted for teacher → an analytical report (Word, ru/kk).
A **learner trainer** (Kazakh language + Mathematics, 6th grade, 15 curriculum topics, lessons + the 3D runner game «Барыс жолы» + a Kazakh chat checker) produces **formative** data that is analysed separately from СОР/СОЧ.
Learners join a school workspace with a 6-digit class code; the methodist assigns topics to support groups and sees growth.

Hackathon jury criteria we optimise for: fit to the case, validity of analytics, practical applicability, UX for an older user, technical quality, novelty.

## 2. Current state

- Branch with all work: `learner-game-and-kazakh-checker` (PR into `main` may still be open — see task P0-1).
- Stack: vanilla HTML/CSS/JS in `dist/` (no build), Node ≥ 20 backend in `server/` (no framework), Vercel config ready (`vercel.json`, `api/index.js`), only dependency `@anthropic-ai/sdk`.
- Pitch page (Kazakh, 10 slides + PDF/PPTX in `dist/downloads/`): `dist/pitch.html` (scroll-story, 3D Barys cubs + the game's leopard via `export { buildLeopard, pose }` in `dist/barys3d.js`; three.js addons vendored in `dist/vendor/addons/`). Script in `docs/PITCH.md`. Every statistic must cite a source (a test checks this); estimates are labelled «болжам».
- Tests: `npm test` → 63 passing (analytics, UI harness, API end-to-end over HTTP, Vercel entry).
- Not done yet: real deployment, real school data, roles/accounts, ГОСО objective codes, Kundelik/BilimClass import, summative before/after comparison.

## 3. Rules you must keep (do not weaken)

1. **Two data layers never mix.** Summative (СОР/СОЧ) → indicators, topics, report, hours. Formative (trainer) → only `growthCompare`, `studentTrainer`, `assignmentProgress`. Lessons record only the first attempt per question.
2. Textbook comparison only **within teachers**; block the conclusion when the teacher–textbook graph is disconnected; wording = association, not causation; "better/worse" needs CI excluding 0 and |diff| ≥ 5 pp.
3. Low data must be labelled (< 10 students or < 30 answers; growth needs ≥ 6 attempts per student and ≥ 5 students). Typical errors need ≥ 10 answers per item.
4. No personal data: pseudonymous codes only; names in imports are replaced by `У-xxxxx`. Never send student codes to the AI (`summaryPayload` holds aggregates only).
5. Never expose `ANTHROPIC_API_KEY` or storage tokens to the browser. AI is optional; everything works without it.
6. Methodist UI: plain school language (СОР/СОЧ, раздел, успеваемость, качество, КТП), «?» help for terms, text size A/A+/A++, ru/kk. Learner UI: Kazakh.
7. Keep `npm test` green; add tests for every new rule or endpoint.

## 4. Tasks (do them in order; open one PR per task group)

### P0 — before the defense

**P0-1. Merge to main.** If PR `learner-game-and-kazakh-checker → main` is open, merge it (no conflicts expected). Work on new branches from `main` afterwards.
*Done when:* `main` contains `server/`, `api/`, `vercel.json`, `DEPLOY.md`.

**P0-2. Deploy to Vercel.** Follow `DEPLOY.md`.
- If a `VERCEL_TOKEN` env var is available: `npx vercel link --yes --token "$VERCEL_TOKEN"` then `npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"`. Otherwise prepare everything and give the owner the exact clicks.
- Storage: Upstash Redis via Vercel Marketplace (env `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`_TOKEN`).
- Optional: `ANTHROPIC_API_KEY` in Vercel env.
*Done when:* `npm run smoke -- https://<prod-domain>` passes and `/api/status` returns `"store":"redis"`. Put the URL at the top of `README.md`.

**P0-3. Verify on real devices.** Methodist on a laptop → «Тренажёр» → «Создать коды классов» → assign a topic; learner on a phone → «Ученик» → «Сыныпқа кір» → finish the task; methodist → «Получить ответы учеников». Check 390 px and 1440 px, light and dark. Fix anything broken; add a test if logic was wrong.

**P0-4. Polish known rough edges.**
- Kazakh mode: translate remaining labels on main screens (subject segment «Казахский язык/Математика», «Язык справки», filter chips in report, hours/trainer headings). Topic names stay as in data.
- Trainer growth table on narrow screens: make it readable without horizontal scroll on 390 px (stack cells into cards).
- In the report preview, ensure Kazakh verdicts and headings everywhere.
*Done when:* switching Рус/Қаз on Главная, Обзор, Тренажёр, Отчёт shows no stray Russian UI labels except topic names.

**P0-5. Demo data story stays honest.** All synthetic data is labelled «демо (синтетика)». Do not change effect sizes to look better.

### P1 — next iteration (practical applicability)

**P1-1. Summative before/after («срезы»).** Allow importing a second СОР/СОЧ for the same topics; per topic and per assignment show «СОР до → СОР после» for assigned vs not assigned students (difference-in-differences with CI, low-data labels). This is the real proof of the support groups' effect.

**P1-2. ГОСО learning objectives.** Optional column `Цель обучения` / `Оқу мақсаты` (codes like `6.1.2.3`) in the journal import; topic stats and the report grouped by objective when present.

**P1-3. Roles.** Workspace roles: methodist (admin key), teacher (per-teacher key: sees only own classes, can upload own journal), learner. Admin key recovery: show once + downloadable file/QR. Endpoints + tests.

**P1-4. Electronic journal import adapters.** Add parsers for exported reports from Kundelik / BilimClass (ask the owner for sample exports; never guess real formats). Map to the journal format; keep name → code replacement.

**P1-5. API hardening.** Rate limiting per IP for `/api/join` and `/api/answers`; size limits already exist — add tests; `DELETE /api/workspaces/me` (delete all school data) for privacy; retention note in README.

### P2 — later

- Full Kazakh localisation of the methodist UI; native-speaker review of Kazakh explanations in `dist/practice.js` and `dist/kazakh.js`.
- Teacher dashboard (own classes only).
- Move heavy bootstrap work to a Web Worker for large schools.
- Quarter-to-quarter dynamics per class and per teacher (with care: teacher comparisons must be framed supportively).

## 5. How to verify locally

```bash
npm install
npm test                                   # must stay green
PORT=4180 node dev-server.cjs              # http://127.0.0.1:4180
npm run smoke -- http://127.0.0.1:4180     # API smoke test against a running server
```

Browser checklist: Методист → Главная, Обзор (успеваемость/качество), Темы (drawer), Ученики (assign to core), Тренажёр (growth + assignments + class codes), Часы (КТП CSV), Отчёт (Word ru/kk), Данные (paste a journal table). Ученик → home tasks, lessons (reading has a passage), «Барыс жолы» (3D leopard, finish a run), chat.

## 6. Defense demo script (3 minutes)

0. Open `/pitch.html` full screen, press → through it (~1 min), then «Кабинет методиста».
1. Главная → «Загрузить результаты СОР/СОЧ» → paste a real anonymised table.
2. Обзор: успеваемость, качество by class.
3. Темы → the hardest topic → typical error.
4. Ученики → support group → «Назначить ядру в тренажёре».
5. Phone: learner joins with the class code, completes the task (20 s).
6. Тренажёр: «СОР/СОЧ и тренажёр — параллельно» + assignment progress.
7. Отчёт → «Скачать справку (Word)» in Kazakh.
Answer to "where is AI?": AI checks free text in the chat and drafts report conclusions; decisions rely on verifiable statistics with blocked wrong conclusions.
