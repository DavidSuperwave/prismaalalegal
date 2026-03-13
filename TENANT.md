# Tenant Configuration — [REDACTED]

## Canonical Slug
`[REDACTED]`

## Supermemory Container Tags
- `[REDACTED]_shared` — shared memories across all agents
- `[REDACTED]_leads` — leads-inbox specific memories
- `[REDACTED]_cases` — case-qualification specific memories

## Agent and Telegram Mapping
| Agent ID | OpenClaw Account ID | Workspace |
|---|---|---|
| `operator` | `operator` | `~/.openclaw/workspace-operator` |
| `leads-inbox` | `leads` | `~/.openclaw/workspace-leads-inbox` |
| `qualified-leads` | `qualified` | `~/.openclaw/workspace-qualified-leads` |

## Notes
- Keep slug/tags aligned with this file across code and workspace docs.
- `openclaw doctor --fix` can overwrite workspace files; re-validate after running it.
