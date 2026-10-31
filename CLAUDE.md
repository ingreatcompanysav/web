# In Great Company — web

## Git

These override the generic rules in `.agents/skills/git-workflow-and-versioning`.

- Branch from `main`. Name branches in plain kebab-case after the work (`client-fixes-oct`, `links-page`) — no `feature/`, `fix/` or `squad/` prefixes, and there is no `dev` branch.
- Commit subjects are one plain-English imperative sentence about what changed on the site ("Email RSVPs a reminder about 24 hours before a gathering"). No `feat:`/`fix:` prefixes, no issue numbers.
- Commit only when asked. Several sessions edit this repo at once, so check `git status` first and stage only your own files.
- `npm run deploy` publishes whatever branch is checked out, so work can be live before it reaches `main`. Say so when that happens.
- There is no test suite. Verify changes with `npm run dev` and the browser.
- Playwright scripts (the `webapp-testing` skill) run with `~/.venvs/playwright/bin/python`, never a `.venv` in the repo: the repo root is the deployed site. Wait for `load`, not `networkidle`, which never settles on the home page. Turnstile rejects `localhost` with the real site key (error 110200), so form submissions need Turnstile's test keys.
