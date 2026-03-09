---
title: 工具页升级：图床入口上线与临时邮箱修复记录
author: 蓝色观者
pubDatetime: 2026-03-09T09:00:00Z
slug: tools-page-image-host-and-temp-mail-fixes-zh
featured: false
draft: false
tags:
  - 工具页
  - Astro
  - Cloudflare
  - 运维记录
description: "这次更新把图床直链卡片加到了工具页，并修复了临时邮箱生成失败（mailfree 配置与 URL 规范化）问题。"
---

这次是一次很实用的小版本迭代，目标很明确：

1. 把已部署的图床能力接到工具页；
2. 修好临时邮箱“生成失败”的线上问题。

## 1) 工具页新增图床入口（中英双版本）

在工具页效率区增加了 `PixelPunk` 图床卡片，当前采用**直链方案**：

- 入口地址：`https://pic.410666.xyz`
- 中文页与英文页都已同步
- 点击后新窗口打开，避免干扰工具页当前会话

为什么先用直链：

- 上线快
- 维护成本低
- 风险隔离更好

后续如果使用频率足够高，再考虑做 API 内嵌。

## 2) 临时邮箱故障修复

线上报错表现为：

- `mailfree config missing`
- `Invalid URL: mail.gemnwong.dpdns.org/api/login`

根因有两类：

- Worker 端缺少 mailfree 相关环境配置；
- `MAILFREE_BASE_URL` 配置未带协议头（`https://`），导致登录 URL 组装失败。

修复动作：

- 部署脚本默认改为 `wrangler deploy --keep-vars`，避免覆盖 Dashboard 现有变量；
- 为 temp-mail 代理增加 `MAILFREE_BASE_URL` 规范化逻辑：
  - 若缺协议自动补 `https://`
  - 统一处理尾部 `/`
  - 无效值给出明确错误

## 3) 页面布局调整

根据使用反馈，工具页卡片布局也做了同步优化：

- 每行最多展示两张卡片
- 删除冗余的 `Coming soon` 占位卡片

中英文工具页都保持一致。

## 4) 当前状态

- 图床入口：可用
- 临时邮箱创建：已恢复
- 工具页布局：已按反馈收敛

如果你在使用中还有具体交互问题（比如文案、按钮层级、移动端尺寸），欢迎直接提，我会继续按“能上线、能维护、少折腾”的标准迭代。
