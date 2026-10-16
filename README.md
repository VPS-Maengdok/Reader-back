# Maengdok - Reader Back

Repository used for Maengdok's proxy using Traefik

## HOW TO INSTALL

### FILL THE `.env`

```bash
cp .env.sample .env
```

### DOCKER COMPOSE

```bash
docker compose up --build -d
```

## CI

Every pull request, and every push to `main` and `develop`, runs `.github/workflows/ci.yml`:

- `npm ci`, ESLint, the unit tests (`npm test`) and `npm run build`;
- `npm audit --omit=dev --audit-level=high`: fails on a high or critical vulnerability in a production dependency;
- a build of the production image (`docker/prod.Dockerfile`), not pushed;
- a gitleaks secret scan of the new commits.

Each push to `main` publishes the production image to GitHub Container Registry, tagged `sha-<commit>` (`release.yml`). Deploys are manual and need an approval (`deploy.yml`). Dependabot opens weekly update pull requests against `main`.
