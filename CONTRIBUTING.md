# Git workflow

## Secrets

- Keep backend secrets in `backend/.env`, copied from `backend/.env.example`. Spring Boot imports that file when the backend runs with `backend` as its working directory.
- Never commit `.env` files. The example files may contain variable names and safe defaults only.
- Do not put server secrets in frontend `VITE_*` variables; frontend variables are exposed to browsers. Configure real credentials as GitHub Actions or deployment secrets.
- Gitleaks scans pushes and pull requests. If a real key was exposed, revoke/rotate it; removing the text from a later commit does not remove it from Git history.

## Branches and commits

- `main` is the protected production branch. Do not push directly to it.
- `develop` is the integration branch. Feature work starts from `develop` and merges back through a pull request.
- Use short-lived branches such as `feature/be-auth`, `feature/fe-canvas-quiz`, `feature/ai-pipeline`, `fix/fe-drag-lag`, or `docs/github-workflow`.
- Each member must make at least 3–4 focused commits per week. Keep each commit buildable and describe one change.
- Use Conventional Commit subjects with a scope, for example `feat(be): add jwt authentication`, `fix(fe): resolve drag and drop lag`, or `docs(github): describe review workflow`.

## Pull requests and review

- Open feature pull requests into `develop`; merge `develop` into `main` for releases.
- Require at least one approval from a different team member. The reviewer should inspect the diff, leave a substantive review comment, then approve. Authors must not approve their own pull requests.
- Resolve review conversations and pass required checks before merging. Prefer squash merging to keep the integration history readable.
- In GitHub repository settings, protect both `main` and `develop`: require pull requests, require at least one approval, dismiss stale approvals after new commits, require status checks (including **Secret scan**), and block force pushes and branch deletion. Disable direct pushes to `main`.
