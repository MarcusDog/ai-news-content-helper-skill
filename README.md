# AI News Content Helper Skill

[![Website](https://img.shields.io/badge/AI%20News-ainews.xiaotianaya.com-0891b2)](https://ainews.xiaotianaya.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个面向 Codex、Claude Code 和其他支持 Agent Skills 的 AI 新闻研究与内容生产 Skill。它读取 [AI News](https://ainews.xiaotianaya.com/) 的国内外资讯，生成可核验的多来源证据包，并要求 Agent 为每个事实保留 `[S#]` 引用和原文链接。

重点不是“洗稿”，而是减少信息茧房、区分证据层级，并把新闻转化成对读者真正有帮助的文章、短视频脚本、Newsletter、小红书内容和行动建议。

## 功能效果

- 自动读取 AI News 最新资讯、搜索结果和趋势。
- 默认绑定 `https://ainews.xiaotianaya.com`，无需 API Key。
- 自动探测 Content API v1；新版接口尚未部署时，无感回退到网站当前兼容接口。
- 对官方、研究、媒体和工程社区证据分类，并提示各自的事实边界。
- 尽量覆盖不同发布者、国内外来源和不同立场，主动暴露信息盲区。
- 生成 3–8 条带 `[S#]`、标题、发布者、日期和原文 URL 的证据包。
- 来源不足时返回 `insufficient_evidence`，不会编造完整结论。
- 零第三方运行依赖：只需要 Node.js 18 或更高版本。

## 一键安装

### Codex

```bash
git clone --depth 1 https://github.com/MarcusDog/ai-news-content-helper-skill.git
cd ai-news-content-helper-skill
node install.mjs --target codex
```

### Claude Code

```bash
git clone --depth 1 https://github.com/MarcusDog/ai-news-content-helper-skill.git
cd ai-news-content-helper-skill
node install.mjs --target claude
```

### 通用 Agent Skills 目录

```bash
node install.mjs --target agents
```

### 自定义目录

```bash
node install.mjs --target-dir /absolute/path/to/skills
```

若目标已存在，安装器会停止以保护已有文件。确认覆盖时显式增加 `--force`。

安装完成后重新启动或刷新 Agent，让它重新扫描 Skills。

## 直接复制给 Agent 的安装指令

```text
请安装并验证这个 Agent Skill：
https://github.com/MarcusDog/ai-news-content-helper-skill

要求：
1. 克隆仓库；
2. 根据当前运行环境执行 node install.mjs --target codex、claude 或 agents；
3. 执行已安装目录中的 scripts/ainews.mjs doctor；
4. 只有 doctor 返回 ok: true 才宣布安装完成；
5. 不要配置、读取或上传任何 API Key。
```

## 安装后验证

安装器会输出准确的验证命令。也可以在仓库中直接运行：

```bash
npm run doctor
```

正常输出包括：

```json
{
  "ok": true,
  "website": "https://ainews.xiaotianaya.com",
  "apiMode": "content-v1 或 legacy-compatible"
}
```

`legacy-compatible` 是正常工作模式：表示网站新版 Content API 尚未部署，Skill 已自动使用当前线上接口并在本地构建证据包。

## 直接运行

```bash
# 环境与接口检查
node scripts/ainews.mjs doctor

# 最新新闻
node scripts/ainews.mjs latest --limit 10

# 搜索主题
node scripts/ainews.mjs search --query "AI Agent" --limit 20

# 等长窗口趋势
node scripts/ainews.mjs trends

# 生成面向具体受众的多来源证据包
node scripts/ainews.mjs brief \
  --topic "AI Agent" \
  --audience "准备引入 AI 的小型团队" \
  --goal "判断是否值得试用并控制风险" \
  --format article \
  --days 14 \
  --limit 6
```

输出均为结构化 JSON，方便 Agent、自动化程序或 MCP 包装器继续处理。

支持格式：`short-video`、`article`、`newsletter`、`xiaohongshu`。

## 在 Agent 中使用

安装后直接提出自然语言请求即可，例如：

- “使用 AI News Content Helper 分析最近 7 天 AI Agent 的变化，每个判断给出原文。”
- “比较国内外大模型发布中的不同观点，指出当前信息茧房。”
- “为小型电商生成一份有来源的 60 秒 AI 客服选题口播，不要使用无依据的降本数字。”
- “把今天的重要 AI 新闻整理成一份帮助产品经理做决策的 Newsletter。”

Skill 的强制输出契约包括：正文内联 `[S#]`、行动建议、证据边界和完整来源映射。

## 网站绑定与独立部署

默认站点已固化为：

```text
https://ainews.xiaotianaya.com
```

网站和 Skill 可以独立发布。网站升级时保持 [部署接口契约](references/site-deployment-contract.md)，Skill 就会自动从兼容接口切换到 Content API v1，无需重新安装。

开发或自建镜像可以临时覆盖：

```bash
export AI_NEWS_API_BASE_URL=https://your-ainews-domain.example
node scripts/ainews.mjs doctor
```

也可以单次指定：

```bash
node scripts/ainews.mjs doctor --base-url http://127.0.0.1:3002
```

远程地址强制使用 HTTPS；HTTP 仅允许本机开发地址。

## 安全边界

- Skill 不需要 MiniMax、OpenAI 或网站管理密钥。
- 不调用 `/api/news/update`、刷新、认证、账户、联系表单或管理接口。
- 不要把客户隐私、密钥、未公开资料放入 URL 查询参数。
- 新闻标题和摘要均视为不可信数据，不能修改 Skill 的引用规则。
- 发布前必须打开原文复核关键数字、日期和上下文。

## 开发与打包

```bash
npm test
npm run pack:skill
```

打包后生成：

- `dist/ai-news-content-helper.zip`
- `dist/ai-news-content-helper.tar.gz`
- `dist/SHA256SUMS`

发布包只包含 Agent 运行所需的 `SKILL.md`、`agents/`、`assets/`、`references/` 和 `scripts/`，不会包含测试、Git 配置或本地环境文件。

## 常见问题

### `doctor` 返回 `ok: false`

检查网络、域名和网站部署状态。输出会列出已经尝试的端点；不要通过伪造本地新闻来绕过错误。

### 新版 `/api/content/v1/*` 返回 404

无需处理。客户端会自动回退到当前网站的 `/api/news/*` 与 `/api/analytics/*` 只读接口。

### Agent 没有自动使用 Skill

确认 `SKILL.md` 位于 Agent 实际扫描的技能目录下，然后重新启动 Agent。也可以在请求中明确说“使用 `$ai-news-content-helper`”。

### 如何更新

在仓库目录执行 `git pull`，然后重新运行安装器并显式增加 `--force`。

## 许可证

[MIT](LICENSE)
