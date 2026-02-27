---
title: 我用 Cloudflare Worker 给自己搭了个 Grok AI 聊天室
author: 蓝色观者
pubDatetime: 2026-02-27T08:00:00Z
slug: grok-cloudflare-worker-mirror
featured: true
draft: false
tags:
  - 极客
  - Cloudflare
  - AI工具
  - 架构记录
description: "没有复杂的后端，没有服务器账单，纯靠 Cloudflare Worker + KV，搭了一个有限流、有防刷、CORS 处理正确的私有化 Grok AI 聊天界面。记录一下折腾过程。"
---

## 起因

故事很俗：某天想用 Grok，但各种套壳和官方网站体验都不理想——要么需要登录、要么广告满天飞、要么需要科学上网。于是想着能不能自己搞一个专属的入口，让自己和朋友可以直接打开就用。

最终结果：[直接体验 → 我的 Grok 聊天室](/chat)

---

## 整体架构

```
浏览器（Astro 前端）
       ↓  fetch POST
Cloudflare Worker（安全网关）
       ↓  转发请求
Grok API 上游
       ↓  SSE 流式返回
Cloudflare Worker 透传
       ↓
浏览器实时渲染
```

没有 VPS，没有 Docker，全跑在 Cloudflare 的边缘节点上，理论上全球任何地方都能毫秒级响应。

---

## 挑战一：CORS 的坑

最先遇到的问题：浏览器直接调 API 会被 CORS 拦住，这是标准的浏览器安全机制。

解决方法是让 Worker 做一层网关，**替浏览器去调 API，再把结果转发回来**，Worker 对浏览器的响应头里加上：

```javascript
"Access-Control-Allow-Origin": "https://你的域名"
```

同时做了 Origin 白名单校验，防止别的网站蹭用你的 Worker：

```javascript
const ALLOWED_ORIGINS = ["https://410666.xyz", "http://localhost:4321"];

if (!ALLOWED_ORIGINS.includes(origin)) {
  return new Response("Forbidden", { status: 403 });
}
```

---

## 挑战二：流式输出（SSE）的透传

Grok API 支持 `stream: true`，边生成边返回，用户体验很好，但也带来了一个问题：Worker 默认是"等完整响应再返回"，这样流就断了。

关键是**直接把 `upstream.body` 传给 `new Response()`**，不要 `await` 等待完整内容：

```javascript
return new Response(upstream.body, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no", // 防止 nginx 层缓冲
  },
});
```

前端用 `ReadableStream` 的 `getReader()` 逐 chunk 解析 SSE 格式，最终实现了打字机效果。

---

## 挑战三：防刷限流（用 Cloudflare KV）

完全不加限制的话，随便一个脚本就能把额度刷爆。

利用 **Cloudflare KV**（免费的分布式 Key-Value 数据库）做了一个精确到 IP + 业务类型的每日计数器：

```javascript
async function checkRateLimit(kv, ip, type, max) {
  const today = new Date().toISOString().split("T")[0];
  const key   = `limit:${ip}:${type}:${today}`;
  const count = parseInt((await kv.get(key)) ?? "0", 10);
  if (count >= max) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}
```

- 聊天：**100 次 / 天 / IP**
- 画图：**20 次 / 天 / IP**
- KV 条目自动 86400 秒后过期，相当于"每天零点自动重置"，不需要任何定时任务

---

## 挑战四：防止用户用聊天模式"白嫖"画图

这个有点意思：API 本身是一个 chat 接口，但支持生图能力。如果不加限制，用户在聊天模式直接说"画个猫"，就绕过了画图的限额。

做了两层防御：

**第一层（0 成本正则前置过滤）：** 短促画图指令（<20 字符且匹配画图关键词）直接在 Worker 端返回一个伪造的 SSE 拒绝响应，不消耗任何 API 额度。

**第二层（系统提示词注入）：** 对所有聊天请求，在 messages 里悄悄注入一段系统提示词，要求模型遵守"纯文本助手"身份，拒绝画图并给出友好引导。

注入方式：把提示词贴在用户消息末尾（而不是 system 角色），这样模型不会把它当作"新任务描述"而复述一遍，用户完全感知不到。

---

## 前端：Astro + 全屏聊天 UI

前端用的是 [AstroPaper](https://github.com/satnaing/astro-paper) 主题框架，在 `/chat` 路由下写了一个完全独立的全屏对话页面（跟博客主题互不干扰）。

几个值得记录的细节：

- **移动端布局**：`html, body` 用 `position: fixed; inset: 0` + `#app` 用 `position: absolute; inset: 0` 组合，彻底解决 iOS/安卓浏览器因为地址栏高度变化导致的输入框悬空问题
- **流式心跳超时**：AbortController + 动态 `resetTimeout()`，每收到一个流 chunk 都续命 60 秒，防止上游悄悄卡死而前端无限"生成中"
- **敏感词软着陆**：触发上游安全审核时（返回 400 或 network error），不是简单报错，而是渲染一段俏皮文案，并自动从历史记录中撤回那条问题消息，下一轮对话不受影响

---

## 部署步骤（极简版）

1. Clone 一个 Worker 项目，`wrangler.toml` 配好 `name` 和 `compatibility_date`
2. `npx wrangler kv:namespace create "RATE_LIMITER"` 创建 KV，把 id 填回 `toml`
3. `npx wrangler secret put API_KEY` 注入 API Key（不写在代码里）
4. `npx wrangler deploy` 发布

前端 Astro 部署到 Cloudflare Pages，Worker 绑定自定义域名，整套跑起来月账单：**￥0**

---

## 最后

如果你也想折腾一个属于自己的 AI 入口，整体难度不高，主要是 Cloudflare 的生态熟悉起来需要一点时间。有任何问题欢迎留言。

**→ [现在就去试试这个 Grok 聊天室](/chat)**
