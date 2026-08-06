# Bound website deployment contract

The Skill's canonical website is `https://ainews.xiaotianaya.com`. The website may be deployed independently from this repository, but it must preserve the following public read-only contract.

## Preferred Content API v1

- `GET /api/content/v1/capabilities`
- `GET /api/content/v1/latest?limit=20&category=`
- `GET /api/content/v1/search?q=&limit=20&category=`
- `GET /api/content/v1/trends`
- `GET /api/content/v1/brief?topic=&audience=&goal=&format=&days=14&limit=6`

Every news or evidence item must include a working original `url`, title, publisher/source, and publication date when known. Region and evidence type improve diversity selection.

## Compatibility routes

Keep these routes available during migration:

- `GET /api/news/status`
- `GET /api/news/latest`
- `GET /api/news/search?q=`
- `GET /api/analytics/smart-trends`

The bundled client probes v1 first and falls back automatically. It never calls update, refresh, authentication, contact, or admin routes.

## Response and CORS requirements

- Return JSON with a boolean `success` field for API routes.
- Return an explicit 4xx/5xx JSON error instead of an HTML error page.
- Preserve original article URLs; the aggregator URL is not a substitute citation.
- Allow read-only `GET` requests from intended Agent runtimes or expose server-to-server access.
- Rate-limit abusive traffic without requiring a browser-visible secret.

Run `node scripts/ainews.mjs doctor --base-url <deployment-url>` after every deployment.
