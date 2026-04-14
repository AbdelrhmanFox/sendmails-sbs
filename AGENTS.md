# SBS Agent Operating Contract

This file defines how AI coding agents should operate safely in this repository.

## Scope and Priorities

- This is an internal SBS staff dashboard repository.
- Ship English-only UI and English documentation updates.
- Keep changes focused to the requested scope. Do not refactor unrelated areas.
- Respect workbook-driven schema decisions and existing Supabase migration order.

## Document Precedence

Apply guidance in this order:

1. `CLAUDE.md` for hard constraints and safety.
2. `AGENTS.md` for repository operating workflow.
3. `README.md` for current architecture and scripts.
4. Feature docs under `docs/` and deploy docs for details.
5. `docs/PROJECT_PROMPT.md` and `docs/PROJECT_BREAKDOWN.md` as historical context only.

If two docs conflict, prefer the higher-priority source.

## Safe Git and Change Behavior

- Never commit secrets (`.env`, API keys, service-role tokens, credentials).
- Never run destructive git commands unless explicitly requested by the user.
- Do not commit or push unless explicitly requested by the user.
- Do not revert user changes outside your task scope.

## Execution Checklist Per Implementation Slice

1. Confirm impacted files match the requested scope.
2. Update related docs when behavior or commands change.
3. Run relevant smoke checks for touched areas.
4. Validate no stale references remain after cleanup/removal.
5. Provide a concise change summary and any residual risks.

## Cleanup Rules

- Remove files only when they are unreferenced and low-risk.
- For medium-risk candidates, gather evidence and request user confirmation before deletion.
- Never delete historical SQL migrations without explicit migration-ledger verification and user approval.

## Escalation Rules

Ask before proceeding when:

- A deletion might impact deployment, onboarding, or shared team workflows.
- Behavior is ambiguous across docs and cannot be resolved from higher-priority sources.
- A requested change conflicts with security or architecture constraints.
