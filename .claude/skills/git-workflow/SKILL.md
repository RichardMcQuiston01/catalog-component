---
name: git-workflow
description: My git branching model and commit message conventions. Use whenever creating a branch, naming a branch, writing a commit message, opening a PR, or discussing git workflow.
---

# Git Workflow

## Long-lived branches

| Branch    | Purpose         |
| --------- | --------------- |
| `main`    | Live/production |
| `dev`     | Development     |
| `staging` | Staging         |

## Short-lived branches

| Prefix           | Purpose                |
| ---------------- | ---------------------- |
| `feature/<name>` | New work               |
| `hotfix/<name>`  | Errors, bugs and fixes |

## Workflow

- For new work, create a `feature/<name>` branch off `dev`. Once it is completed and tested, merge it back to `dev` via a PR.
- If there is a `staging` branch, merge from `dev` to `staging` via a PR for final testing. Once testing is done, merge from `staging` to `main` via a PR.
- If there is no `staging` branch, merge from `dev` to `main` via a PR.
- Work on errors, bugs, and fixes should be done on a `hotfix/<name>` branch off the affected branch (e.g. `dev`). Once tested and complete, merge it from the `hotfix/` branch back to the branch it came from (e.g. `dev`).
- A hotfix made off `main` must also be merged into `dev`, so the fix is not lost.

## Merging

- Merge PRs with a merge commit. Do not squash or rebase.
- To bring a branch up to date with another, fast-forward when necessary (e.g. fast-forward `dev` to `main` after a promotion).
- Do not delete branches after merging. The owner cleans them up when merging on GitHub.

## Commit Messages

- Always use Conventional Commits (`type(scope): summary`).
- Summary line 50 characters or less.
- Blank line between subject and body.
- Body wraps and explains _why_, not just _what_.
