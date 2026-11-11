# Jaz!

Kazakh literacy practice website, with local Comfortaa, lessons, messenger-style scenarios, manual corrections, XP and real browser-local progress.

Run `node dev-server.cjs`, then visit http://127.0.0.1:4174 . Tests: `node --test tests/*.test.cjs`.

The practice mentor is a finite offline exercise engine, not a connected LLM. Known word corrections and prewritten scenarios are explicitly distinguished from unrestricted, unverified messages. No external AI service or API key is included. There are no real peer chats, subscriptions, leaderboards or invented educational measurements. Conversations and progress stay in this browser; reload preserves them, clearing browser data removes them. Comfortaa is included under SIL OFL in dist/fonts/Comfortaa-OFL.txt.

The header switches between the existing Kazakh learner experience and a Russian methodologist workspace. It includes deterministic 98-student datasets for mathematics and Kazakh, clean/confounded textbook scenarios, validated CSV import/export, topic-by-class diagnostics, teacher-stratified textbook comparisons with 1000 seeded student bootstrap samples, and integer lesson allocation by largest remainders. Synthetic datasets are labelled throughout. Imported student codes, test records and live learner answers remain in browser-local storage; there is no server database or cross-device synchronization.

`dist/curriculum.js` transplants the supplied `jaz-metodist.html` generator and core analytics into an isolated engine with flat CSV adapters. Comparison uses observed teacher/textbook overlap, selected topic and filters, and reports association rather than a causal effect. Input scores are never invented for imported learner records. Periods use the latest date for the selected subject. The source reference's zero-priority allocation edge case is handled explicitly: if topics exist but every priority is zero, the reserve is shared equally and the UI identifies this fallback. With no rows, no recommendation is made.

Use «Скачать шаблон CSV» to export the active dataset with the required header. Reimporting it preserves the observations and calculations. Only pseudonymous student codes are required. Enter no names, photos or private identifiers into CSV files.
