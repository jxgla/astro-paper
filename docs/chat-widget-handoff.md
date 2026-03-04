# Astro Paper 首页 UI 交接说明（Glow + Chatbot Slot）

## 1. 目标与本轮完成项

本轮针对首页（中文 / 英文）做了两类 UI 强化：

1. **氛围层（Ambient Glow）**
   - 在页面左右两侧增加了蓝青色系光晕与细网格纹理，降低页面“空”的观感。
   - 采用固定定位 + 轻微漂移动画，保持“科技感”而不过度抢内容。

2. **右下角聊天机器人预留位（占位）**
   - 在右下角增加固定占位容器，仅用于后续挂载旧聊天机器人。
   - 当前为视觉占位（虚线边框 + 标签），不包含任何业务逻辑。

---

## 2. 已修改文件

- `src/pages/index.astro`
- `src/pages/en/index.astro`

两者已保持一致结构，区别仅在文案语言。

---

## 3. 关键结构（供后续任务快速定位）

### 3.1 首页氛围层
在 `<main>` 内添加了：

- `.ambient-shell`
- `.ambient-orb.ambient-orb-left`
- `.ambient-orb.ambient-orb-right`
- `.ambient-grid`

作用：
- `.ambient-orb-*`：左右两侧 radial glow。
- `.ambient-grid`：弱化网格纹理，增加层次。

### 3.2 机器人预留挂载位
在 `<main>` 底部添加了：

- `#chatbot-reserved-slot.chatbot-slot-placeholder`

内部：
- `.chatbot-slot-border`
- `.chatbot-slot-label`

行为特性：
- `position: fixed; right/bottom` 固定在右下。
- `pointer-events: none;` 当前不拦截点击。
- `z-index: 35;` 为未来悬浮组件预留层级基础。
- `hidden md:block`，移动端默认隐藏。

---

## 4. 后续接入聊天机器人（下一任务建议）

### 4.1 推荐接入方式

- 保留 `#chatbot-reserved-slot` 作为挂载锚点。
- 由脚本在客户端把旧机器人挂到该容器内（或替换容器内容）。
- 若旧机器人自带 fixed 定位，建议改为“容器内绝对定位”，避免与全站浮层冲突。

### 4.2 需要确认的约束

1. 目标尺寸（建议 320~360px 宽，560~640px 高）
2. 移动端策略（隐藏 / 底部抽屉 / 全屏）
3. 层级策略（是否高于 header、toast、modal）
4. 收起/展开交互是否由站点统一管理

### 4.3 接入检查清单

- [ ] CN/EN 首页都能正确显示机器人
- [ ] 不遮挡主要 CTA 与文章列表
- [ ] 深浅色下边框与背景对比可读
- [ ] 不影响 Lighthouse 可访问性分数
- [ ] 无控制台报错、无 hydration warning

---

## 5. 视觉参数说明（便于继续打磨）

- 光晕色系：蓝 (`rgba(59,130,246,...)`) + 青 (`rgba(56,189,248,...)`)
- 动画：`ambientDrift`，16s 循环，轻位移轻缩放
- 网格：`64px` 步长 + `mask-image` 做中心衰减
- 预留位：半透明背景 + 虚线 accent 边框 + 轻毛玻璃

可调优优先顺序：
1. `opacity`（先控强度）
2. `blur`（再控软硬）
3. `width/height clamp`（最后控空间占比）

---

## 6. 风险与注意事项

1. 当前使用了 `color-mix(...)`，主流现代浏览器支持良好；若需兼容更老版本，可加 fallback 颜色。
2. 占位容器目前 `pointer-events: none`，接入真实机器人时需改回可交互。
3. 占位在 `md` 以下隐藏；若要移动端启用，需同步处理安全区与键盘顶起问题。

---

## 7. 新任务可直接复用的 Prompt（建议）

> 请在 astro-paper 中接入旧版聊天机器人到 `#chatbot-reserved-slot`，保持中英文首页一致行为；桌面端右下悬浮，移动端先隐藏。要求不遮挡现有 CTA，保证深浅色可读，且不引入控制台错误。完成后给出变更文件、关键样式参数和回归测试清单。
