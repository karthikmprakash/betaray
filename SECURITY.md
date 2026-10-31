# Security Policy

## Supported versions

Betaray is pre-1.0. Security fixes are applied to `main` and the latest tagged release.

## Reporting a vulnerability

Please **do not** open a public issue.

- Open a draft [security advisory](https://github.com/karthikmprakash/betaray/security/advisories/new), or
- Email the maintainers listed on the repository profile.

Include steps to reproduce, impact, and any relevant logs (redact secrets). You’ll receive an acknowledgment within 48 hours and we’ll coordinate a fix and disclosure timeline.

## Scope

- Authentication, session handling, org/project isolation, API-token scoping, Jira OAuth token handling
- Self-hosted deployment guidance in `README.md` and `docs/jira-integration.md`

Out of scope: brute-force without rate-limit bypass evidence, reports requiring a compromised server, and social-engineering of Jira/Atlassian accounts.

## Hardening your deployment

Set `APP_URL`, keep `JIRA_TOKEN_KEY` stable, run behind HTTPS, and treat `.env` as a secret. See `README.md` and `docs/jira-integration.md` for deployment notes.
