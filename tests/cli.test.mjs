import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';

import {
  AiNewsClient,
  buildLocalBrief,
  normalizeBaseUrl
} from '../scripts/ainews.mjs';

const articles = [
  {
    id: 'qwen-1',
    title: 'Qwen Agent 官方版本发布',
    description: '官方介绍了新的 Agent 能力。',
    source: 'Qwen 官方博客',
    url: 'https://qwen.example/agent',
    publishedAt: '2026-08-06T08:00:00Z',
    region: 'cn',
    sourceGroup: 'product'
  },
  {
    id: 'paper-1',
    title: 'Agent evaluation benchmark',
    description: 'A research benchmark for agent evaluation.',
    source: 'arXiv Artificial Intelligence',
    url: 'https://arxiv.example/agent',
    publishedAt: '2026-08-05T08:00:00Z',
    region: 'global',
    sourceGroup: 'research'
  },
  {
    id: 'media-1',
    title: 'AI Agent enters enterprise workflows',
    description: 'A reported enterprise adoption story.',
    source: 'TechCrunch AI',
    url: 'https://techcrunch.example/agent',
    publishedAt: '2026-08-04T08:00:00Z',
    region: 'global',
    sourceGroup: 'investment'
  }
];

let server;
let baseUrl;

before(async () => {
  server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url.startsWith('/api/content/v1/')) {
      response.statusCode = 404;
      response.end(JSON.stringify({ success: false, error: '接口不存在' }));
      return;
    }
    if (request.url.startsWith('/api/news/latest') || request.url.startsWith('/api/news/search')) {
      response.end(JSON.stringify({ success: true, data: { data: articles, total: articles.length } }));
      return;
    }
    if (request.url.startsWith('/api/analytics/smart-trends')) {
      response.end(JSON.stringify({ success: true, data: { topKeywords: [], comparison: { status: 'insufficient_history' } } }));
      return;
    }
    if (request.url === '/health') {
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ success: false }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('base URL accepts HTTPS and local HTTP but rejects unsafe remote HTTP and credentials', () => {
  assert.equal(normalizeBaseUrl('https://ainews.xiaotianaya.com/'), 'https://ainews.xiaotianaya.com');
  assert.equal(normalizeBaseUrl('http://127.0.0.1:3002/'), 'http://127.0.0.1:3002');
  assert.throws(() => normalizeBaseUrl('http://example.com'), /HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@example.com'), /凭据/);
});

test('client automatically falls back to the deployed legacy API and normalizes articles', async () => {
  const client = new AiNewsClient({ baseUrl });
  const result = await client.latest({ limit: 2 });

  assert.equal(result.apiMode, 'legacy-compatible');
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].url, articles[0].url);
  assert.equal(result.items[0].region, 'cn');
});

test('doctor reports ready when either v1 or the legacy compatibility layer is available', async () => {
  const client = new AiNewsClient({ baseUrl });
  const result = await client.doctor();

  assert.equal(result.ok, true);
  assert.equal(result.apiMode, 'legacy-compatible');
  assert.equal(result.website, baseUrl);
});

test('local brief fallback creates diverse cited evidence without inventing claims', () => {
  const brief = buildLocalBrief(articles, {
    topic: 'Agent',
    audience: '小型团队',
    goal: '评估是否值得试用',
    format: 'article',
    limit: 6
  });

  assert.equal(brief.status, 'ready');
  assert.equal(brief.evidence.length, 3);
  assert.deepEqual(brief.evidence.map((item) => item.citationId), ['S1', 'S2', 'S3']);
  assert.equal(new Set(brief.evidence.map((item) => item.source)).size, 3);
  assert.equal(new Set(brief.evidence.map((item) => item.evidenceType)).size, 3);
  assert.match(brief.prompt, /\[S1\]/);
  assert.match(brief.prompt, /https:\/\/qwen\.example\/agent/);
});

test('local brief explicitly reports regional and evidence-type filter-bubble gaps', () => {
  const brief = buildLocalBrief(articles.slice(1), { topic: 'Agent', limit: 6 });

  assert(brief.blindSpots.some((item) => item.code === 'missing_cn'));
  assert(brief.blindSpots.some((item) => item.code === 'missing_official'));
  assert.match(brief.prompt, /当前证据盲区/);
});
