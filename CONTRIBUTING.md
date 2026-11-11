# Contributing

## Branches

- `main` is always working. Nobody commits to `main` directly.
- Branch names: `m1/<task>`, `m2/<task>`, `m3/<task>`. Example: `m2/orders-api`.
- Start each day with `git pull origin main`, then `git rebase main` (or merge) on your branch.
- One checklist group per PR. Keep PRs small: one review from a teammate, then merge.

## Commits

- Prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- Never commit `.env`. Update `.env.example` when you add a variable.

## API changes

If you change an API shape, update `docs/api.md` in the same PR and tell the frontend owner.

## Review by path

| Path | Required reviewer |
| --- | --- |
| `docs/api.md` | Member 2 (writer) plus the owner of the consuming code |
| `database/` | Member 3. Member 2 reviews schema-facing changes. |
| `backend/src/chat.js`, `routes/chat.js` | Member 3 |
| `backend/src` (all other files) | Member 2 |
| `frontend/src/admin/` | Member 3 |
| `frontend/src/` (other), `components/ui/`, `styles/` | Member 1. Member 3 reviews admin-facing wrapper changes. |

## Definition of Done (per task)

- [ ] Runs with the repository dev script.
- [ ] Matches `docs/api.md`. If an endpoint changed, the docs change in the same PR.
- [ ] Errors show a message in the standard `{ error, details }` format. No crashes or blank screens.
- [ ] Layout checked at 375 px width.
- [ ] Only design tokens are used. No raw hex, px or ms values.
- [ ] The task's manual QA steps run and pass.
- [ ] PR reviewed and merged to `main`.
- [ ] Checkbox ticked in your member file in `docs/`.
