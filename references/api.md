# AI News Content API

Default base URL: `https://ainews.xiaotianaya.com`

Local development base URL: `http://localhost:3002`

All endpoints used by this Skill are read-only and return JSON. No API key is required.

## Recommended client

Run:

```bash
node "<skill-directory>/scripts/ainews.mjs" doctor
node "<skill-directory>/scripts/ainews.mjs" latest --limit 10
node "<skill-directory>/scripts/ainews.mjs" search --query "AI Agent"
node "<skill-directory>/scripts/ainews.mjs" trends
node "<skill-directory>/scripts/ainews.mjs" brief --topic "AI Agent" --audience "小型团队" --goal "评估是否试用" --format article
```

The client prefers the v1 routes below. When v1 is not yet available on the independently deployed website, it automatically uses `/api/news/latest`, `/api/news/search`, and `/api/analytics/smart-trends`, then normalizes the response. Never write endpoint fallback logic ad hoc.

## Capabilities

`GET /api/content/v1/capabilities`

Lists supported tools and the citation policy.

## Latest news

`GET /api/content/v1/latest?limit=20&category=AI新闻`

Use for broad monitoring. Every item includes its original `url`, publisher, publication date, region, and source group.

## Search

`GET /api/content/v1/search?q=Agent&limit=20&category=新工具`

`q` is required. Use short topic terms rather than full questions.

## Trends

`GET /api/content/v1/trends`

Returns topics comparing the most recent seven days with the preceding seven days. Each topic includes `recentCount`, `previousCount`, `growth`, `trend`, and `sources`.

## Content brief

`GET /api/content/v1/brief?topic=Agent&audience=小型电商商家&goal=降低客服成本&format=short-video&days=14&limit=6`

Parameters:

- `topic`: topic terms
- `audience`: intended beneficiary
- `goal`: practical outcome
- `format`: `short-video`, `article`, `newsletter`, or `xiaohongshu`
- `days`: 1–30, default 14
- `limit`: 3–8, default 6

Success returns an evidence pack, diversity counts, a citation policy, an output guide, and a source-bound prompt. HTTP 422 means the current query does not have enough evidence; inspect `data.notice`, expand the window once, or narrow the claim.

## Safe usage

Never call `/api/admin/*`, `/api/news/update`, authentication endpoints, or refresh endpoints from this skill. Do not send private customer data in query parameters.

Only remote HTTPS origins are accepted. Plain HTTP is restricted to `localhost`, `127.0.0.1`, and `::1` for development.
