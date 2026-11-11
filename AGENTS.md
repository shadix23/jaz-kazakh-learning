# AGENTS.md — guide for coding agents (Codex, Claude Code, Cursor)

Jaz! is a hackathon project for **Case 1 «Data-Driven Curriculum»**: an EdTech platform for school methodists that analyses test results by curriculum topic, finds hard topics, compares textbooks and recommends teaching hours. A learner trainer (Kazakh + Mathematics, 6th grade) produces live answers for the analytics.

Read `docs/CASE-ANALYSIS.md` and `docs/METHODIST-RESEARCH.md` first: it states the user, the jury criteria and the methodology. Every change must keep the product oriented to that case.

## Run and test

```bash
npm install            # only dependency: @anthropic-ai/sdk (server-side AI mentor)
npm start              # = node dev-server.cjs → http://127.0.0.1:4174
npm test               # = node --test tests/*.test.cjs  (must stay green)
```

No build step, no framework, no bundler. Files in `dist/` are served as-is. Node ≥ 20.

Optional AI mentor for the chat: set `ANTHROPIC_API_KEY` (or log in with `ant auth login`) before `npm start`. Without credentials the server answers `/api/status → {ai:false}` and the chat uses the offline rules engine. Never put a key in browser code or in the repo.

## Architecture

| File | Role |
|---|---|
| `dist/index.html` | Shell. Script order matters: `kazakh.js → practice.js → learning.js → motion.js → curriculum.js → metodist.js → game.js → app.js`. |
| `dist/curriculum.js` | **Analytics engine** (UMD, pure functions, Node-testable). CSV parse/export, demo data generator, topic stats, item analysis, textbook comparison (OLS `gain ~ textbook + teacher (+ topic)` + bootstrap CI), hour planning, insights. |
| `dist/metodist.js` | **Methodist workspace UI** (Russian): Обзор (incl. live trainer data), Темы, Ученики (risk levels, support groups, student profile), Учебники, Часы, Отчёт (optional AI conclusions), Данные. String templates + small animation helpers. Exposes `JazMetodist.{mount, unmount, renderStudentContext, recordAnswer}`. |
| `dist/metodist.css` | Methodist design system (tokens `--mx-*`, light/dark). |
| `dist/kazakh.js` | **Kazakh rules engine** (UMD): vowel harmony, suffix choice (plural, cases, possessive, question particle), Russian-keyboard letter repair, sentence checks. `check(text)` → `{corrected, issues[{from,to,reason,type}], coverage}`. |
| `dist/practice.js` | **Question generators** for the 12 curriculum topics (6 Kazakh, 6 Math) + gamification helpers (`runXp`, `BADGES`). Topic names (ru) must equal the curriculum topic names. |
| `dist/learning.js` | Learner progress model (XP, levels, streak, events), lessons = practice topics, chat assessment (`assessMessage`, `verifyCorrection`). |
| `dist/app.js` | **Learner app shell** (Kazakh UI): routes `home, lessons, game, chat, progress`, subject switch, lesson dialog, chat (AI first, rules fallback), mode switch to the methodist. |
| `dist/game.js` + `game.css` | **«Барыс жолы»**: original three-lane answer runner on Canvas 2D. `JazGame.{mount, destroy, stats}`. Records every answer through `JazMetodist.recordAnswer`. |
| `dist/barys3d.js` | ES module: procedural 3D snow leopard (three.js, `dist/vendor/three.module.min.js` r170, MIT) with gallop/jump/celebrate/hit/idle animation, rendered on a transparent canvas over the game. Falls back to the 2D sprite if WebGL fails. |
| `dist/student.css` | Learner typography (Nunito) and new learner components. |
| `dev-server.cjs` | Static server + `GET /api/status`, `POST /api/correct` (chat checking) and `POST /api/summary` (methodist conclusions from aggregates only — never student codes). Claude via `@anthropic-ai/sdk`, structured JSON output, model `claude-opus-5-5`, server-side fallback. |

### Data contract

CSV / row schema (one row = one answer): `student_id, class, teacher, subject, textbook, topic, question_id, correct(0|1), date(YYYY-MM-DD)` + optional `pretest(0–100), question_text, answer, correct_answer`. Without `pretest` textbooks are compared on final scores with a caveat.

Journal import (what schools actually have): one row per student × section with `Ученик, Класс, Раздел, Балл, Макс. балл` (+ optional `Учитель, Предмет, Учебник, Вид, Дата`), Russian or Kazakh headers, CSV/TSV or Excel paste → `parseJournal()` turns each point into an answer row; names are replaced by codes `У-xxxxx`. Journal point-items (`question_id` contains `·`) are excluded from item analysis.

Learner answers reach analytics through:

```js
JazMetodist.recordAnswer({ subject, topic, lessonId, questionId, questionText, correct, answer, correctAnswer, date })
```

They are linked to the student selected in the learner's «Оқу деректері» panel (class + pseudonymous code); the baseline row gives teacher, textbook and pretest.

### Methodology (do not weaken)

- Mastery: student's share correct per topic ≥ threshold (60/70/80, default 70). Low data: < 10 students or < 30 answers.
- Textbook comparison only within teachers; blocked when the teacher–textbook graph is disconnected; wording is association, never causation; "better/worse" needs CI excluding 0 **and** |diff| ≥ 5 pp.
- Hours: program total is preserved; extra hours = reserve + up to 20% from topics mastered by ≥ 85%; proportional to share not mastered × hours × weight; cap +50% per topic; integer largest remainders.
- School indicators: mark from percent of points 40/65/85 → 3/4/5; успеваемость = share ≥ «3», качество = share ≥ «4»; levels низкий < 40, средний 40–84, высокий ≥ 85.
- Students: risk high ≥ 2/3 topics not mastered, medium ≥ 1/3; support-group "core" = ≤ 40% correct. Risk is a signal for the methodist, not a grade.
- Typical errors and "hard" flags need ≥ 10 answers per item, so single live answers never dominate.
- Demo data is synthetic and labelled as such everywhere.

## Conventions

- Languages: methodist UI **Russian or Kazakh** (`st.lang`; strings in `KK`/`RU`/`tabText`, report in `spravkaHTML(lang)`), learner UI **Kazakh**, code/comments **English**.
- Methodist UX targets older users: start screen `homeUI()` with task cards, text size `st.zoom` (CSS `zoom` 1/1.15/1.3), `helpBtn(key)` + `HELP` glossary for every term. Keep labels in plain school language (СОР/СОЧ, раздел, успеваемость, качество, КТП).
- Vanilla JS, no dependencies in `dist/`. Engines are UMD (`module.exports` + `window.X`) so tests can `require` them.
- Escape every dynamic string with `esc()` before putting it in HTML.
- Persist only in `localStorage` keys: `jaz.methodist.v2`, `jaz.progress.v1`, `jaz.chats.v1`, `jaz.game.v1`, `jaz.subject.v1`, `jaz.mode.v1`, `jaz.theme.v1`. Wrap storage in try/catch.
- Never store names or private data; student IDs are pseudonymous codes.

### Design rules (methodist workspace = "Operate" surface)

- One sans family (system UI) for the methodist; learner UI uses Nunito (supports Ә Ғ Қ Ң Ө Ұ Ү Һ І); Comfortaa only for the `jaz!` wordmark.
- No eyebrow labels above headings, no colored left borders on cards, no nested cards, no gradient text, no emoji as icons (inline SVG only).
- Palette: blue for data/actions, amber/green/red only as status. Use tokens, not raw hex, in `metodist.css`.
- Motion: UI transitions ≤ 300 ms with `cubic-bezier(.23,1,.32,1)`; data morph 520 ms `cubic-bezier(.77,0,.175,1)` via `clip-path`; drawer `cubic-bezier(.32,.72,0,1)`. Animate only transform/opacity/clip-path. Gate hover with `@media (hover:hover) and (pointer:fine)`. Always provide a `prefers-reduced-motion` path (keep fades, drop movement).
- Responsive: no horizontal scroll at 1440/1024/768/390/320; touch targets ≥ 44 px on coarse pointers.

## How to extend

- **New curriculum topic:** add it to `DEMO_SUBJECTS` in `curriculum.js` (name, hours, questions) **and** a generator with the same `topic` string in `practice.js`; `tests/practice.test.cjs` checks they match.
- **New Kazakh rule:** add to `RULES`/`PHRASES` in `kazakh.js`, explain in simple Kazakh, add a case to `tests/kazakh.test.cjs`. Never mark unknown words as wrong.
- **New methodist section:** add to `TABS` in `metodist.js` and a `xxxUI()` renderer; keep filters/state in `st` and persist via `save()`.

## Definition of done

`npm test` passes; the page loads with no console errors; check the changed screen at desktop and 390 px, light and dark; methodology rules above still hold.
