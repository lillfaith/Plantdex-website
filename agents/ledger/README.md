# Task ledger

One markdown file per task at `agents/ledger/<lane>/<task>.md`, started from `agents/templates/task-card.md`.
One file per task means two agents can never conflict here.

Status values: `queued | in-progress | blocked | review | merged | failed`.
The owning agent appends progress and the final report; only the coordinator moves a task to `merged`.
A task is `review` only with real `npm run verify` output attached. A task that could not be finished is
`failed` with the error, and stays in the ledger.
