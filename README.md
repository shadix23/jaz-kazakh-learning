# Jaz!

Kazakh literacy practice website, with local Comfortaa, lessons, messenger-style scenarios, manual corrections, XP and real browser-local progress.

Run `node dev-server.cjs`, then visit http://127.0.0.1:4174 . Tests: `node --test tests/learning.test.cjs`.

The practice mentor is a finite offline exercise engine, not a connected LLM. Known word corrections and prewritten scenarios are explicitly distinguished from unrestricted, unverified messages. No external AI service or API key is included. There are no real peer chats, subscriptions, leaderboards or invented educational measurements. Conversations and progress stay in this browser; reload preserves them, clearing browser data removes them. Comfortaa is included under SIL OFL in dist/fonts/Comfortaa-OFL.txt.
