# Сообщение для Codex (скопируйте всё ниже линии)

---

You are continuing the project **Jaz!** in this repository - a hackathon solution for Case 1 «Data-Driven Curriculum» (EdTech platform for school methodists in Kazakhstan + a learner trainer that feeds formative data).

1. Read `docs/dev/HANDOFF.md` completely, then `AGENTS.md`, `docs/CASE-ANALYSIS.md`, `docs/METHODIST-RESEARCH.md`, `DEPLOY.md`.
2. Run `npm install` and `npm test` (58 tests must pass), then start `PORT=4180 node dev-server.cjs` and run `npm run smoke -- http://127.0.0.1:4180`.
3. Do the tasks in `docs/dev/HANDOFF.md` section 4 in order, starting with **P0-1 (merge `learner-game-and-kazakh-checker` into `main`)** and **P0-2 (deploy to Vercel)**. One PR per task group, from a new branch off `main`.
4. Keep every rule in section 3 of the handoff (two data layers never mix, textbook comparison within teachers, low-data labels, no personal data, no secrets in the browser, plain school language in the methodist UI, tests green).
5. If something needs my action (Vercel login, Upstash, API key, sample exports from Kundelik/BilimClass), stop and tell me the exact steps instead of guessing.
6. After each task: run `npm test`, run the smoke test (against the deployed URL once it exists), and report what changed, what you verified, and what is still open.

Reply in Russian.
