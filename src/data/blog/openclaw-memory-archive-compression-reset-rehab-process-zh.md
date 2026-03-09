---
title: OpenClaw 记忆归档、压缩、Reset、复健流程
pubDatetime: 2026-03-09T06:45:00Z
modDatetime: 2026-03-09T06:45:00Z
description: 直接说明 OpenClaw 当前长期记忆的归档、压缩、reset 与复健执行流程。
tags:
  - OpenClaw
  - Memory
  - Workflow
  - Reset
  - Archive
featured: true
draft: false
---

## 1. 目的

这份文档用来把 OpenClaw 现在这套长期记忆的归档、压缩、reset 前处理和 reset 后复健流程完整记下来，方便后面继续沿用。

平时做完一轮工作，很多信息会散在聊天、session、临时文件和人脑印象里。时间一长，就容易出现“做过，但接不上”“记得有这回事，但找不到正式入口”的情况。

把这些流程统一写清楚以后，后面无论是收口、交接、/new 还是 /reset，都可以按同一套方法处理，知道信息该落到哪里，缺什么要补什么，回来以后该从哪里接。

> 这份文档可以直接当执行说明看。
> 平时补记忆、项目收口、准备 reset、reset 后复健，都按这里的规则走。

---

## 2. 当前正式记忆结构

当前长期记忆固定分为四层：

- `sessions`
- `memory/*.md`
- `memory/topics/*.md`
- `MEMORY.md`

对应职责如下。

### 2.1 sessions
- 保存原始流水
- 用于完整回放
- 不承担快速复健职责
- 不直接当长期摘要使用

### 2.2 `memory/*.md`
- 保存日期级 / 项目级摘要
- 记录高价值结论
- 记录当前状态、关键路径、关键决策、风险、下一步
- 不堆大段日志
- 不堆连续命令流水

### 2.3 `memory/topics/*.md`
- 保存专题级总纲
- 把同主题多份 `memory/*.md` 再压一层
- 代表该主题的当前正式认知
- 适合 reset 后优先阅读

### 2.4 `MEMORY.md`
- 只做长期索引
- 只放日期、主题、一句话结论、标签、路径
- 不写成长正文
- 不重复展开细节

一句话规则：

- sessions 保原文
- `memory/*.md` 保摘要
- `memory/topics/*.md` 保总纲
- `MEMORY.md` 只保索引

---

## 3. 什么内容应该进入长期记忆

以下内容应该进入 `memory/` 或 `memory/topics/`：

- 关键配置变更
- 新节点 / 新服务接入
- 新脚本 / 新 workflow 落地
- 重要排障结论
- 关键决策与原因
- 后续大概率还会继续使用的路径、入口、方法
- 老板明确要求“记住”的内容
- 项目收口时的正式状态

以下内容不应直接进入长期记忆：

- 临时试错过程
- 未确认猜测
- 大段原始日志
- 连续命令流水
- 闲聊
- 重复信息
- 一次性临时文件说明

---

## 4. 归档流程

这里的“归档”，指的是把本轮工作中真正值得长期保留的内容，正式写入记忆体系，而不是只留在聊天里。

### 4.1 日常归档触发条件

如果当天出现以下任一情况，就应归档：

- 新服务 / 新节点 / 新入口
- 关键配置改动
- 新 workflow 或规则落地
- 重要排障结论
- 老板说“记住”
- 未来 7 天内大概率继续做

如果以上都没有：

- 不强行写长摘要
- session 保留原始流水即可

### 4.2 日常归档步骤

1. 回看当天关键 session 或关键文件变更
2. 提炼以下内容：
   - 做了什么
   - 当前状态
   - 关键路径
   - 关键决策
   - 风险 / 坑点
   - 下次如何继续
3. 写入 `memory/YYYY-MM-DD.md`
4. 在 `MEMORY.md` 增加一条索引
5. 如果属于已有主题，顺手更新对应 `memory/topics/*.md`

### 4.3 大项目归档步骤

如果是跨 VPS、跨 claw、真实部署、真实上线、长期维护主题，按大项目流程处理：

1. 收证据
   - 正式路径
   - 正式入口
   - 正式脚本
   - 当前正式状态
2. 清垃圾
   - tmp
   - 临时下载
   - 临时压缩包
   - 一次性脚本
   - 调试残留
   - 误写文件
3. 写日期摘要到 `memory/*.md`
4. 写或更新专题文件到 `memory/topics/*.md`
5. 更新 `MEMORY.md` 索引
6. 确认进入备份链路

---

## 5. 压缩流程

“压缩”不是删除记忆，而是把原始流水整理成可接手、可复用、可继续演进的结构。

### 5.1 压缩时必须保留的锚点

长期记忆压缩时，下面这些内容不能丢：

1. 当前正式状态
2. 正式路径 / 正式入口 / 正式脚本
3. 关键决策和原因
4. 高频风险和坑点
5. 下次如何继续
6. 可回溯锚点（对应摘要文件或 session）

### 5.2 压缩触发条件

出现以下任一情况，应做一次压缩：

- 重要项目收口
- 同主题累计 3 份以上 `memory/*.md`
- 单份摘要超过 150~200 行
- `MEMORY.md` 超过 120 行
- 某主题进入长期维护阶段
- 准备 `/new`、`/reset`、交接、归档前

### 5.3 项目级压缩步骤

1. 阅读相关 session / 当日摘要
2. 提取结论、状态、锚点、风险
3. 写入 `memory/YYYY-MM-DD.md` 或项目摘要文件
4. 在 `MEMORY.md` 增加索引

### 5.4 专题级压缩步骤

1. 收集同主题 3 份以上日期摘要
2. 合并重复结论
3. 收敛成当前正式状态
4. 写入 `memory/topics/*.md`
5. 让 `MEMORY.md` 优先指向专题文件

---

## 6. `MEMORY.md` 索引协议

`MEMORY.md` 只保留：

- 日期
- 一句话结论
- 标签
- 对应路径

示例格式：

- **2026-03-08**：长期记忆结构收敛为 `sessions / memory / topics / MEMORY`，并明确 `daily_chat/` 不再作为正式长期记录入口。详见 `memory/2026-03-08.md`、`memory/RESET_REHAB.md`。 #memory #reset

禁止事项：

- 禁止把 `MEMORY.md` 写成第二份正文
- 禁止大段复制 `memory/*.md` 内容到 `MEMORY.md`
- 禁止在 `MEMORY.md` 堆日志、命令、闲聊

---

## 7. `daily_chat/` 的当前定位

当前规则已经收敛：

- `daily_chat/` 不再作为正式长期记忆入口
- 长期信息、归档、补档、复盘、topic 压缩统一写入 `memory/` 或 `memory/topics/`
- `MEMORY.md` 继续只做索引

原因：

- `daily_chat/` 更像每日过程记录
- 如果长期内容只留在 `daily_chat/`，后续会出现“记过了，但没正式进入长期结构”的问题
- 长期资产需要进入可复健、可压缩、可索引的层级

---

## 8. Reset 前流程

当准备 `/new`、`/reset`，或者明显感觉上下文过胖时，按下面流程执行。

### 8.1 Reset 前检查

1. 确认当天重要结论是否已进入 `memory/` 或 `memory/topics/`
2. 确认 `MEMORY.md` 已有索引入口
3. 确认需要长期保留的专题是否已更新
4. 更新 `memory/RESET_REHAB.md`
5. 再执行 reset

### 8.2 Reset 前最低动作

如果时间很紧，至少做这 4 步：

1. 更新 `memory/YYYY-MM-DD.md`（如果今天有重要进展）
2. 在 `MEMORY.md` 加索引
3. 更新 `memory/RESET_REHAB.md`
4. 再 reset

### 8.3 Reset 前禁止事项

- 不要在还没落盘时直接 reset
- 不要把重要结论只留在 session
- 不要以为“我记得”就等于已经完成记忆归档

---

## 9. Reset 后复健流程

reset 后不要先翻旧 session。当前正式做法是先走复健入口。

### 9.1 阅读顺序

按这个顺序读：

1. `MEMORY.md`
2. `memory/topics/*.md`
3. `memory/YYYY-MM-DD.md`
4. sessions

### 9.2 这个顺序的原因

#### 先读 `MEMORY.md`
用于快速定位当前有哪些长期主题、最近有哪些重要变化、应该往哪里继续读。

#### 再读 `topics`
用于快速恢复当前正式认知，而不是陷入日期流水。

#### 再读日期摘要
用于补最近几天的演进细节。

#### 最后才回放 sessions
只有需要原始证据或完整上下文时，才进 session。

### 9.3 最低复健动作

如果 reset 后时间很紧，最低只做：

1. 读 `MEMORY.md`
2. 读 `memory/topics/backup.md`
3. 读 `memory/topics/team-claw-map.md`
4. 再按当前问题补读对应 topic

---

## 10. `RESET_REHAB.md` 的作用

`memory/RESET_REHAB.md` 不是完整历史，而是复健入口。

它的职责是：

- 告诉 reset 后应该先看什么
- 告诉当前最重要的长期主题有哪些
- 告诉不同问题应该跳到哪个 topic
- 告诉最小复健动作是什么

它不负责替代 `memory/*.md`、`topics`、sessions。

它负责把 reset 后的阅读路径缩短。

---

## 11. 备份与记忆体系的关系

当前长期保留已改成双轨：

- workspace 白名单备份
- sessions 增量备份

原因：

1. 不再同步整个 workspace，避免垃圾、缓存、误下载项目污染长期备份
2. 原始细节由 sessions 回放承担
3. 长期高价值信息进入 `memory/`
4. 只保 `MEMORY.md` 不够，因为会出现“索引指向空气”

当前原则：

- session 负责原始回放
- `memory/` 负责压缩摘要
- `topics` 负责专题总纲
- `MEMORY.md` 负责定位入口
- 备份负责保证这些正式资产不会丢

---

## 12. 阶段收口补充规则

当前已正式固化：每个 claw 做完项目或阶段后，都必须主动补齐以下事项：

1. `archive`
2. `retro`
3. `cleanup`

阶段回执至少应包含：

- `archive_written=yes/no`
- `retro_written=yes/no`
- `cleanup=yes/no`
- `leftover=none/...`

这条规则的意义是：

- 没有 evidence，不算完成
- 没有归档，不算进入长期资产
- 没有 cleanup，不算真正收口

---

## 13. 一句话执行版

### 日常版
> 有重要进展 → 写 `memory/YYYY-MM-DD.md`  
> 在 `MEMORY.md` 挂索引  
> 有已有主题 → 更新对应 topic

### 项目收口版
> 先收证据  
> 再清垃圾  
> 再写 `memory/`  
> 再写 / 更新 `topics`  
> 再更新 `MEMORY.md`  
> 最后确认进入备份

### Reset 前版
> 先确认重要信息已落盘  
> 更新 `MEMORY.md`  
> 更新 `RESET_REHAB.md`  
> 再 reset

### Reset 后版
> 先读 `MEMORY.md`  
> 再读 `topics`  
> 再读日期摘要  
> 最后才看 sessions

---

## 14. 当前总原则

当前关于记忆系统的总原则已经固定为下面这几条。

1. Text > Brain
2. sessions 保原文
3. `memory/*.md` 保摘要
4. `memory/topics/*.md` 保总纲
5. `MEMORY.md` 只保索引
6. 长期信息统一进入 `memory/`，不再把 `daily_chat/` 当正式长期入口
7. reset 前先补记忆，再更新复健入口
8. reset 后先走 topic，不先翻旧 session
9. 项目结束先 cleanup，再归档、再复盘
10. 没有 evidence 不算正式完成

#OpenClaw #Memory #Workflow #Reset #Archive