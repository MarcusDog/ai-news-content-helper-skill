#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BASE_URL = 'https://ainews.xiaotianaya.com';

const EVIDENCE_PRIORITY = ['official', 'research', 'media', 'engineering'];
const FORMAT_SECTIONS = {
  'short-video': ['痛点开场', '发生了什么', '证据与边界', '可执行建议'],
  article: ['读者问题', '核心结论', '多方证据', '反方与限制', '行动清单'],
  newsletter: ['本期判断', '三条信号', '不同视角', '本周行动'],
  xiaohongshu: ['问题钩子', '关键发现', '避坑提醒', '步骤清单']
};

export class AiNewsApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AiNewsApiError';
    this.code = options.code || 'AINEWS_API_ERROR';
    this.status = options.status || null;
    this.endpoint = options.endpoint || null;
    this.attemptedEndpoints = options.attemptedEndpoints || [];
  }
}

export function normalizeBaseUrl(input = DEFAULT_BASE_URL) {
  let parsed;
  try {
    parsed = new URL(String(input || DEFAULT_BASE_URL));
  } catch {
    throw new AiNewsApiError('AI News Base URL 格式无效', { code: 'INVALID_BASE_URL' });
  }
  if (parsed.username || parsed.password) {
    throw new AiNewsApiError('Base URL 不得包含用户名或凭据', { code: 'UNSAFE_BASE_URL' });
  }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    throw new AiNewsApiError('远程 AI News API 必须使用 HTTPS', { code: 'UNSAFE_BASE_URL' });
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function inferRegion(article = {}) {
  if (article.region === 'cn' || article.region === 'global') return article.region;
  const sourceText = `${article.source || ''} ${article.url || ''}`.toLowerCase();
  return /官方|量子位|机器之心|新智元|雷峰网|极客公园|爱范儿|少数派|钛媒体|qwen|deepseek|internlm|modelscope|paddle|mindspore|\.cn(?:\/|$)/.test(sourceText)
    ? 'cn'
    : 'global';
}

export function classifyEvidenceType(article = {}) {
  const sourceText = `${article.source || ''} ${article.sourceGroup || ''}`.toLowerCase();
  if (/官方|official|openai news|deepmind|microsoft research|qwen|deepseek|internlm|modelscope|paddle|hugging face|pytorch|tensorflow/.test(sourceText)) return 'official';
  if (/research|arxiv|paper|论文|大学|实验室|benchmark/.test(sourceText)) return 'research';
  if (/investment|techcrunch|venturebeat|the verge|technology review|量子位|机器之心|新智元|雷峰网|极客公园|媒体|新闻/.test(sourceText)) return 'media';
  return 'engineering';
}

function evidenceBoundary(type) {
  return {
    official: '官方一手信息；产品效果仍需独立验证',
    research: '研究或论文；结论受样本、方法、同行评审与复现条件限制',
    media: '媒体报道；关键数字和归因应回查一手材料',
    engineering: '工程或社区实践；个案经验不等于普遍结论'
  }[type];
}

export function normalizeArticle(article = {}) {
  return {
    id: article.id || article.url || null,
    title: article.title || '未命名资讯',
    description: article.description || article.summary || '',
    source: article.source || article.publisher || '未知来源',
    url: article.url || article.link || null,
    publishedAt: article.publishedAt || article.published_at || article.date || null,
    category: article.category || null,
    region: inferRegion(article),
    sourceGroup: article.sourceGroup || null,
    evidenceType: classifyEvidenceType(article)
  };
}

function extractArticles(payload = {}) {
  const candidate = payload?.data?.data ?? payload?.data?.items ?? payload?.data ?? payload?.items ?? [];
  return (Array.isArray(candidate) ? candidate : [])
    .map(normalizeArticle)
    .filter((article) => article.url);
}

function matchesTopic(article, topic) {
  if (!topic) return true;
  const terms = String(topic).toLowerCase().split(/[\s,，、]+/).filter(Boolean);
  const searchable = `${article.title} ${article.description} ${article.category || ''}`.toLowerCase();
  return terms.some((term) => searchable.includes(term));
}

export function buildLocalBrief(inputArticles = [], options = {}) {
  const topic = String(options.topic || '').trim();
  const audience = String(options.audience || '希望解决实际问题的读者').trim();
  const goal = String(options.goal || '理解影响并采取行动').trim();
  const format = FORMAT_SECTIONS[options.format] ? options.format : 'article';
  const limit = boundedInteger(options.limit, 6, 3, 8);
  const candidates = inputArticles
    .map(normalizeArticle)
    .filter((article) => article.url && matchesTopic(article, topic))
    .sort((left, right) => EVIDENCE_PRIORITY.indexOf(left.evidenceType) - EVIDENCE_PRIORITY.indexOf(right.evidenceType)
      || new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0));
  const selected = [];
  const used = new Set();

  EVIDENCE_PRIORITY.forEach((type) => {
    const candidate = candidates.find((article) => article.evidenceType === type && !used.has(article.id || article.url));
    if (candidate && selected.length < limit) {
      selected.push(candidate);
      used.add(candidate.id || candidate.url);
    }
  });
  candidates.forEach((candidate) => {
    if (selected.length >= limit) return;
    const identifier = candidate.id || candidate.url;
    if (!used.has(identifier) && selected.filter((item) => item.source === candidate.source).length < 2) {
      selected.push(candidate);
      used.add(identifier);
    }
  });

  const evidence = selected.map((article, index) => ({
    citationId: `S${index + 1}`,
    ...article,
    claimBoundary: evidenceBoundary(article.evidenceType)
  }));
  const citationLines = evidence.map((item) => `[${item.citationId}] ${item.title}｜${item.source}｜${item.publishedAt || '日期未知'}｜${item.url}`);
  const publishers = new Set(evidence.map((item) => item.source));
  const regions = new Set(evidence.map((item) => item.region));
  const evidenceTypes = new Set(evidence.map((item) => item.evidenceType));
  const blindSpots = [
    !regions.has('cn') && { code: 'missing_cn', message: '当前证据缺少国内来源，不应概括为国内外共同趋势。' },
    !regions.has('global') && { code: 'missing_global', message: '当前证据缺少国际来源，不应概括为全球趋势。' },
    !evidenceTypes.has('official') && { code: 'missing_official', message: '当前证据缺少官方一手材料，产品事实需要继续核验。' },
    !evidenceTypes.has('research') && { code: 'missing_research', message: '当前证据缺少研究或独立评估，不应作强效果结论。' }
  ].filter(Boolean);
  const prompt = [
    `请面向“${audience}”，围绕“${topic || '当前 AI 动态'}”解决“${goal}”，输出 ${format}。`,
    '只使用下列证据。每个事实、数字、日期、归因和趋势判断后都标注有效 [S#]。',
    '区分官方陈述、研究结论、媒体报道、工程经验和推断；证据不足时缩小结论，不得用记忆补齐。',
    '主动呈现不同发布者、证据类型和国内外视角，并给出低成本、可验证、对读者有帮助的行动建议。',
    `当前证据盲区：${blindSpots.length ? blindSpots.map((item) => item.message).join('；') : '未发现明显的地区或关键证据类型缺口。'}`,
    citationLines.join('\n') || '[无可用来源：停止生成事实性回答]'
  ].join('\n\n');

  return {
    status: evidence.length >= 2 ? 'ready' : 'insufficient_evidence',
    generatedAt: new Date().toISOString(),
    apiMode: 'legacy-compatible-local-brief',
    request: { topic, audience, goal, format },
    evidence,
    diversity: {
      sources: publishers.size,
      regions: regions.size,
      evidenceTypes: evidenceTypes.size
    },
    blindSpots,
    outputGuide: {
      format,
      sections: FORMAT_SECTIONS[format].map((title) => ({ title, citationRequired: true })),
      rule: '每个事实性判断后标注 [S#]；无法由来源支持的内容必须写成推断或删除。'
    },
    prompt,
    citationPolicy: '逐条引用原文 URL；优先一手材料；来源不足时不生成确定性结论。',
    notice: evidence.length >= 2
      ? `已通过线上兼容接口构建证据包；发布前仍需打开原文复核关键数字和上下文。${blindSpots.length ? '同时保留并披露当前证据盲区。' : ''}`
      : '没有足够来源支持可靠回答，请扩大时间范围、更换关键词或等待新版内容 API 上线。'
  };
}

export class AiNewsClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.AI_NEWS_API_BASE_URL || DEFAULT_BASE_URL);
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.timeoutMs = boundedInteger(options.timeoutMs, 15000, 1000, 60000);
    if (typeof this.fetchImpl !== 'function') {
      throw new AiNewsApiError('需要 Node.js 18+ 的内置 fetch', { code: 'FETCH_UNAVAILABLE' });
    }
  }

  async fetchJson(endpoint) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'AyaNewsSkill/2.0' },
        signal: controller.signal
      });
      const text = await response.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch {
        throw new AiNewsApiError('AI News API 返回了非 JSON 内容', { code: 'INVALID_RESPONSE', status: response.status, endpoint });
      }
      return { status: response.status, ok: response.ok, payload, endpoint };
    } catch (error) {
      if (error instanceof AiNewsApiError) throw error;
      const message = error?.name === 'AbortError' ? 'AI News API 请求超时' : '无法连接 AI News API';
      throw new AiNewsApiError(message, { code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', endpoint });
    } finally {
      clearTimeout(timeout);
    }
  }

  assertResponse(response, attemptedEndpoints = []) {
    if (!response.ok || response.payload?.success === false) {
      throw new AiNewsApiError(response.payload?.error || `AI News API 请求失败（HTTP ${response.status}）`, {
        status: response.status,
        endpoint: response.endpoint,
        attemptedEndpoints
      });
    }
    return response.payload;
  }

  async capabilities() {
    const v1 = await this.fetchJson('/api/content/v1/capabilities');
    if (v1.ok && v1.payload?.success !== false) {
      return { apiMode: 'content-v1', ...v1.payload.data };
    }
    const legacy = await this.fetchJson('/api/news/status');
    if (legacy.ok && legacy.payload?.success !== false) {
      return {
        apiMode: 'legacy-compatible',
        apiVersion: 'legacy-compatible',
        purpose: '通过兼容层读取 AI News 并在本地生成带来源证据包',
        citationPolicy: '所有事实性输出保留原文 URL；来源不足时停止确定性生成。'
      };
    }
    const latestProbe = await this.fetchJson('/api/news/latest?limit=1');
    this.assertResponse(latestProbe, [v1.endpoint, legacy.endpoint, latestProbe.endpoint]);
    return {
      apiMode: 'legacy-compatible',
      apiVersion: 'legacy-compatible',
      purpose: '通过兼容层读取 AI News 并在本地生成带来源证据包',
      citationPolicy: '所有事实性输出保留原文 URL；来源不足时停止确定性生成。'
    };
  }

  async latest(options = {}) {
    const limit = boundedInteger(options.limit, 20, 1, 50);
    const params = new URLSearchParams({ limit: String(limit) });
    if (options.category) params.set('category', String(options.category));
    const v1Endpoint = `/api/content/v1/latest?${params}`;
    const v1 = await this.fetchJson(v1Endpoint);
    if (v1.ok && v1.payload?.success !== false) {
      return { apiMode: 'content-v1', items: extractArticles(v1.payload).slice(0, limit), meta: v1.payload.meta || {}, endpoint: v1Endpoint };
    }
    const legacyEndpoint = `/api/news/latest?${params}`;
    const legacy = await this.fetchJson(legacyEndpoint);
    const payload = this.assertResponse(legacy, [v1Endpoint, legacyEndpoint]);
    return { apiMode: 'legacy-compatible', items: extractArticles(payload).slice(0, limit), meta: payload.pagination || {}, endpoint: legacyEndpoint };
  }

  async search(query, options = {}) {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) throw new AiNewsApiError('search 需要 --query', { code: 'MISSING_QUERY' });
    const limit = boundedInteger(options.limit, 20, 1, 50);
    const params = new URLSearchParams({ q: cleanQuery, limit: String(limit) });
    if (options.category) params.set('category', String(options.category));
    const v1Endpoint = `/api/content/v1/search?${params}`;
    const v1 = await this.fetchJson(v1Endpoint);
    if (v1.ok && v1.payload?.success !== false) {
      return { apiMode: 'content-v1', query: cleanQuery, items: extractArticles(v1.payload).slice(0, limit), meta: v1.payload.meta || {}, endpoint: v1Endpoint };
    }
    const legacyEndpoint = `/api/news/search?${params}`;
    const legacy = await this.fetchJson(legacyEndpoint);
    const payload = this.assertResponse(legacy, [v1Endpoint, legacyEndpoint]);
    return { apiMode: 'legacy-compatible', query: cleanQuery, items: extractArticles(payload).slice(0, limit), meta: payload.pagination || {}, endpoint: legacyEndpoint };
  }

  async trends() {
    const v1Endpoint = '/api/content/v1/trends';
    const v1 = await this.fetchJson(v1Endpoint);
    if (v1.ok && v1.payload?.success !== false) return { apiMode: 'content-v1', data: v1.payload.data, endpoint: v1Endpoint };
    const legacyEndpoint = '/api/analytics/smart-trends';
    const legacy = await this.fetchJson(legacyEndpoint);
    const payload = this.assertResponse(legacy, [v1Endpoint, legacyEndpoint]);
    return { apiMode: 'legacy-compatible', data: payload.data, endpoint: legacyEndpoint };
  }

  async review() {
    const endpoint = '/api/analytics/diversity-review';
    const response = await this.fetchJson(endpoint);
    const payload = this.assertResponse(response, [endpoint]);
    return { ...(payload.data || {}), endpoint };
  }

  async brief(options = {}) {
    const params = new URLSearchParams({
      topic: String(options.topic || ''),
      audience: String(options.audience || ''),
      goal: String(options.goal || ''),
      format: String(options.format || 'article'),
      days: String(boundedInteger(options.days, 14, 1, 30)),
      limit: String(boundedInteger(options.limit, 6, 3, 8))
    });
    const v1Endpoint = `/api/content/v1/brief?${params}`;
    const v1 = await this.fetchJson(v1Endpoint);
    if ((v1.ok || v1.status === 422) && v1.payload?.data) {
      return { ...v1.payload.data, apiMode: 'content-v1' };
    }
    const topic = String(options.topic || '').trim();
    const result = topic
      ? await this.search(topic, { limit: 50, category: options.category })
      : await this.latest({ limit: 50, category: options.category });
    return buildLocalBrief(result.items, options);
  }

  async doctor() {
    try {
      const capabilities = await this.capabilities();
      return {
        ok: true,
        website: this.baseUrl,
        apiMode: capabilities.apiMode,
        node: process.version,
        message: capabilities.apiMode === 'content-v1'
          ? 'AI News Content API v1 已就绪。'
          : '新版 Content API 尚未启用，兼容层已就绪并可正常生成本地证据包。'
      };
    } catch (error) {
      return {
        ok: false,
        website: this.baseUrl,
        apiMode: 'unavailable',
        node: process.version,
        error: error.message,
        attemptedEndpoints: error.attemptedEndpoints || [error.endpoint].filter(Boolean)
      };
    }
  }
}

function parseArguments(argumentsList) {
  const parsed = { _: [] };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const token = argumentsList[index];
    if (!token.startsWith('--')) {
      parsed._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argumentsList[index + 1];
    if (!next || next.startsWith('--')) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function helpText() {
  return `AyaNewsSkill CLI\n\nUsage:\n  node scripts/ainews.mjs doctor\n  node scripts/ainews.mjs latest --limit 10 [--category AI新闻]\n  node scripts/ainews.mjs search --query "AI Agent" --limit 20\n  node scripts/ainews.mjs trends\n  node scripts/ainews.mjs review\n  node scripts/ainews.mjs brief --topic "AI Agent" --audience "小团队" --goal "评估落地" --format article\n\nConfiguration:\n  AI_NEWS_API_BASE_URL=${DEFAULT_BASE_URL}\n  --base-url https://your-domain.example\n`;
}

export async function runCli(argumentsList = process.argv.slice(2)) {
  const args = parseArguments(argumentsList);
  const command = args._[0] || 'doctor';
  if (args.help || command === 'help') return { help: helpText() };
  const client = new AiNewsClient({ baseUrl: args['base-url'] });
  if (command === 'doctor') return client.doctor();
  if (command === 'capabilities') return client.capabilities();
  if (command === 'latest') return client.latest({ limit: args.limit, category: args.category });
  if (command === 'search') return client.search(args.query || args.q || args._[1], { limit: args.limit, category: args.category });
  if (command === 'trends') return client.trends();
  if (command === 'review') return client.review();
  if (command === 'brief') return client.brief({
    topic: args.topic,
    audience: args.audience,
    goal: args.goal,
    format: args.format,
    days: args.days,
    limit: args.limit,
    category: args.category
  });
  throw new AiNewsApiError(`未知命令：${command}`, { code: 'UNKNOWN_COMMAND' });
}

async function main() {
  try {
    const result = await runCli();
    if (result.help) process.stdout.write(result.help);
    else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === false) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      success: false,
      error: error.message,
      code: error.code || 'UNEXPECTED_ERROR',
      attemptedEndpoints: error.attemptedEndpoints || [error.endpoint].filter(Boolean)
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1]
  && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  await main();
}
