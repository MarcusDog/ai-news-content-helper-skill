---
name: ai-news-content-helper
description: Use when a user asks for current AI news synthesis, topic research, trend interpretation, self-media scripts or articles, or practical AI advice that must remain verifiable and avoid a single-source filter bubble.
---

# AI News Content Helper

Turn current AI news into useful content without hiding uncertainty or trapping the reader in one source ecosystem. Prefer helping a specific audience solve a concrete problem over merely summarizing headlines.

## Non-negotiable rules

1. Cite every factual claim, number, attribution, release detail, and trend statement with one or more `[S#]` markers.
2. Keep each `[S#]` mapped to a title, publisher, date, and clickable original URL.
3. Label source boundaries: official statement, research finding, media report, engineering/community experience, or inference.
4. Never rewrite a media report as confirmed fact. Never treat a company claim as independent validation.
5. Seek at least 3 distinct sources and 2 evidence types. Include domestic and international sources when both are relevant and available.
6. If evidence is insufficient or conflicting, say so and narrow the conclusion. Do not fill gaps from memory.
7. Give low-cost, testable, audience-specific actions. Separate actions from factual conclusions.

Read [evidence-rules.md](references/evidence-rules.md) before drafting. Read [api.md](references/api.md) when using the AI News API. Read only the selected format section in [content-formats.md](references/content-formats.md). Read [site-deployment-contract.md](references/site-deployment-contract.md) only when deploying or replacing the bound website API.

## Runtime check

Use the bundled zero-dependency client instead of guessing endpoint versions:

```bash
node "<skill-directory>/scripts/ainews.mjs" doctor
```

The client is permanently bound by default to `https://ainews.xiaotianaya.com`. It automatically prefers Content API v1 and falls back to the site's deployed read-only legacy endpoints. Override with `AI_NEWS_API_BASE_URL` only for an explicitly provided mirror or local development server.

If `doctor` returns `ok: false`, report the attempted endpoints and stop. Do not scrape arbitrary pages, invent news, or switch to an unrelated provider without the user's approval.

## Workflow

### 1. Frame the beneficial problem

Extract or reasonably infer:

- `topic`: the AI subject or current event
- `audience`: who needs help
- `goal`: the real decision, obstacle, or desired outcome
- `format`: `short-video`, `article`, `newsletter`, or `xiaohongshu`
- `freshness`: default 14 days; use 7 for fast news and up to 30 for thin topics

State the problem in one sentence. Ask only if the missing choice would materially change the answer.

### 2. Retrieve a diverse evidence pack

Run the bundled client with the fields above:

```bash
node "<skill-directory>/scripts/ainews.mjs" brief \
  --topic "AI Agent" \
  --audience "小型团队" \
  --goal "判断是否值得试用" \
  --format article
```

The client calls `GET /api/content/v1/brief` when available. If the independently deployed website has not enabled v1 yet, it searches the current website API and deterministically constructs the same citation ledger locally.

If the brief returns `insufficient_evidence`:

1. Expand `days` once, up to 30.
2. Simplify the topic into one or two core terms.
3. Use the bundled `search` and `trends` commands to find adjacent evidence.
4. If still insufficient, stop and report what is missing.

Do not use admin refresh, source reset, authentication, or internal maintenance endpoints.

### 3. Run the diversity gate

Build an evidence ledger with columns: citation ID, claim supported, evidence type, region, publisher, date, URL, limitation.

Before drafting, check:

- at least 3 distinct publishers unless the user explicitly requests a single-source summary;
- no more than 2 selected items from one publisher;
- at least 2 evidence types;
- both `cn` and `global` regions when the topic has meaningful domestic/international coverage;
- primary or research evidence for strong product-performance or scientific claims;
- at least one source that adds a different perspective, limitation, or counterpoint.

If a condition cannot be met, disclose that gap near the conclusion.

### 4. Separate claim layers

Use these exact logical layers while reasoning:

- **Confirmed in source:** directly stated in an original release, document, dataset, or paper.
- **Reported:** attributed to a named media or secondary source.
- **Inferred:** analysis derived from multiple sources; explicitly mark it as an inference.
- **Unknown:** cannot be supported by retrieved evidence; omit or state the uncertainty.

Never merge layers into a stronger claim.

### 5. Draft for usefulness

Select the matching template from `assets/`:

- `short-video-template.md` for 45–90 second scripts
- `article-template.md` for articles and newsletters
- `problem-solving-template.md` for practical answers and step-by-step guidance

Lead with the audience's pain point or decision. Explain why the evidence matters to them. Prefer a small experiment, checklist, or decision rule over generic advice.

### 6. Claim-by-claim citation audit

Before responding, inspect every sentence:

- Add `[S#]` immediately after factual language.
- Add multiple citations when a statement is synthesized from multiple sources.
- Rephrase unsupported certainty as a bounded inference or remove it.
- Ensure every `[S#]` appears once in the final source list with a working URL.
- Ensure advice is labeled as advice, not evidence.

Do not cite the AI News API response itself when the response already includes the original article URL. Cite the original URL.

## Response contract

Return, in order:

1. The requested content or answer, with inline `[S#]` citations.
2. `行动建议` containing concrete, low-risk next steps.
3. `证据边界` describing disagreements, missing perspectives, and uncertainty.
4. `来源` mapping every `[S#]` to publisher, title, date, evidence type, and clickable URL.

For a content brief, also include the selected angle, intended audience, and evidence ledger. For a publish-ready draft, keep the citation markers unless the user explicitly asks for a separate fact-check sheet.
