---
title: "公开仓库也能安全分发 Token：GitHub Actions + age 加密 Release + VPS 自动体检清理"
pubDatetime: 2026-03-15T19:30:00Z
modDatetime: 2026-03-15T19:30:00Z
description: "用 age 把 token 制品加密后发布到 GitHub Release，并在 VPS 端自动拉取、全量检测、删除失效并通过 Telegram 汇报。"
tags: [github-actions, age, systemd, devops, security, telegram, tokens]
featured: false
draft: false
---

很多人做 token 自动化时，最容易踩的坑不是脚本写得不够花，而是“分发链路”不安全：

- 仓库是 public，但你又想用 GitHub Actions 稳定产出 token；
- 你希望 VPS 自动同步到生产目录；
- 你还想做健康度检测（失效就清理），最后给你发个 TG 汇总。

这篇文章记录一条在 **public repo** 也能跑的端到端方案：**Token 工厂 → 加密发布 → VPS 自动拉取 → 全量探测 → 删除失效 → TG 汇报**。文中不包含任何可复用的真实密钥/账号信息，全部用占位符。

## 把“token 分发”变成“发布密文制品”

核心策略只有一句话：

> GitHub Release 上永远只放密文（`tokens.zip.age`），明文 token 从不离开 runner 与目标 VPS。

因此，即便仓库与 Release 都是公开的，别人下载到的也只是一坨密文。

我们用的是 **age**（一个很轻量的公钥加密工具）：

- Actions 端只需要 **公钥**（`AGE_RECIPIENT=age1...`），公钥即使泄露也没关系。
- VPS 端保存 **私钥**（`AGE_IDENTITY=/root/.config/age/xxx.key`），权限收紧到 `600`。

## 产出侧：GitHub Actions 生成 token → zip → age 加密 → 上传 Release

假设你的任务脚本会输出：`codex/*.json`。

Actions 做三件事：

1) 把 `codex/*.json` 打包成 `tokens.zip`（明文只存在于 runner 临时环境）
2) 用 age 公钥加密成 `tokens.zip.age`
3) 生成一个 `manifest.json`（包含 sha256、数量、时间戳），并把这两个文件上传到 Release

### 配置要点（不敏感）

在仓库的 **Actions Secrets**（或 Variables）里准备：

- `AGE_RECIPIENT`：age 公钥（`age1...`）
- （可选）`TG_BOT_TOKEN`、`TG_CHAT_ID`：如果你暂时想要 Actions 侧的轻量提醒

并确保 workflow 有：

```yaml
permissions:
  contents: write
```

这样就能用 GitHub 自动注入的 `${{ github.token }}` 完成 release 创建与 asset 上传，无需 PAT。

### 一个重要细节：Release tag 必须每次运行唯一

如果你一天跑几十次 release，tag 不能按“日期”命名，否则会冲突。

推荐 tag：

`tokens-YYYYMMDD-HHMMSS-r<RUN_NUMBER>-a<RUN_ATTEMPT>`

下面是一个可复用的工作流（示例文件名：`.github/workflows/regi+release.yml`）：

```yaml
name: Daily Task Job

on:
  schedule:
    - cron: "*/40 * * * *"
  workflow_dispatch:
    inputs:
      count:
        description: "本次注册数量"
        required: false
        default: "40"

permissions:
  contents: write
  actions: read

jobs:
  register:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run registration
        env:
          REG_COUNT: ${{ github.event.inputs.count || '40' }}
        run: |
          mkdir -p codex
          for i in $(seq 1 $REG_COUNT); do
            python task_runner.py --once || true
            sleep $((RANDOM % 20 + 10))
          done

      - name: Install age
        if: always()
        run: |
          sudo apt-get update
          sudo apt-get install -y age

      - name: Package + Encrypt + Upload Release asset
        if: always()
        env:
          AGE_RECIPIENT: ${{ secrets.AGE_RECIPIENT }}
          GH_TOKEN: ${{ github.token }}
        run: |
          set -euo pipefail

          COUNT=$(( $(find codex -name '*.json' 2>/dev/null | wc -l) + 0 ))
          [ "$COUNT" -gt 0 ] || exit 0

          ZIP_NAME="tokens.zip"
          ENC_NAME="tokens.zip.age"
          MANIFEST="manifest.json"

          rm -f "$ZIP_NAME" "$ENC_NAME" "$MANIFEST"
          zip -r "$ZIP_NAME" codex/*.json

          age -r "$AGE_RECIPIENT" -o "$ENC_NAME" "$ZIP_NAME"

          SHA256=$(sha256sum "$ENC_NAME" | awk '{print $1}')
          DATE_TAG=$(date +%Y%m%d-%H%M%S)
          TAG="tokens-${DATE_TAG}-r${GITHUB_RUN_NUMBER}-a${GITHUB_RUN_ATTEMPT}"

          cat > "$MANIFEST" <<EOF
          {
            "tag": "${TAG}",
            "sha256": "${SHA256}",
            "count": ${COUNT},
            "generated_at": "$(date -Is)"
          }
          EOF

          gh release create "$TAG" \
            --title "Tokens ${DATE_TAG}" \
            --notes "Encrypted token bundle (assets are age-encrypted)." \
            --latest=false || true

          gh release upload "$TAG" "$ENC_NAME" "$MANIFEST" --clobber
```

## Release 清理：只保留最近 6 小时（否则会爆炸）

高频发布时，Release 会迅速膨胀。下面的 workflow 每 15 分钟清一次，删除 6 小时前的 `tokens-*` release：

```yaml
name: Cleanup old token releases (keep 6 hours)

on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete token releases older than 6 hours
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          KEEP_HOURS: 6
        run: |
          set -euo pipefail

          cutoff_epoch=$(date -u -d "${KEEP_HOURS} hours ago" +%s)

          gh api "repos/${REPO}/releases?per_page=100" --paginate |
            jq -r '.[] | [.tag_name, .created_at] | @tsv' |
          while IFS=$'\t' read -r tag created_at; do
            case "$tag" in
              tokens-*)
                created_epoch=$(date -u -d "$created_at" +%s)
                if [ "$created_epoch" -lt "$cutoff_epoch" ]; then
                  gh release delete "$tag" -y
                fi
                ;;
            esac
          done
```

## 消费侧：VPS 拉取 Release → 校验 → 解密 → 追加落盘

VPS 上的同步器建议做到三点：

- 只处理 `tokens-*` release
- 用 `manifest.json` 做 sha256 校验
- 解密后只把 `codex/*.json` **追加**到目标目录（例如 `/opt/cli-proxy-plus/auths/`），不覆盖旧文件（可用 `cp -n`）

一个实用的小经验：增量判断优先用 `published_at`（不存在再回退 `created_at`），并在本地写 state，避免重复处理。

下面是一份“可运行的骨架版”同步脚本（关键变量用 env 占位）：

```bash
#!/usr/bin/env bash
set -euo pipefail

# /etc/token-sync.env
# REPO="owner/repo"
# AGE_IDENTITY="/root/.config/age/your-private.key"
# MAX_PER_RUN="20"

source /etc/token-sync.env

BASE="/opt/cli-proxy-plus/token-sync"
INBOX="$BASE/inbox"
WORK="$BASE/work"
STATE="$BASE/state.json"
DEST="/opt/cli-proxy-plus/auths"

mkdir -p "$INBOX" "$WORK" "$DEST"

LAST=""
[ -f "$STATE" ] && LAST=$(jq -r '.last_published_at // ""' "$STATE" 2>/dev/null || true)

RELEASES=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases?per_page=50")
CANDIDATES=$(echo "$RELEASES" | jq -c '[.[] | select(.tag_name|startswith("tokens-")) | {tag:.tag_name, t:(.published_at // .created_at)}] | sort_by(.t)')

TOTAL=$(echo "$CANDIDATES" | jq 'length')
PROCESSED=0

for i in $(seq 0 $((TOTAL-1))); do
  TAG=$(echo "$CANDIDATES" | jq -r ".[$i].tag")
  T=$(echo "$CANDIDATES" | jq -r ".[$i].t")

  [ -z "$LAST" ] || [[ "$T" > "$LAST" ]] || continue

  MANIFEST_URL="https://github.com/${REPO}/releases/download/${TAG}/manifest.json"
  ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/tokens.zip.age"

  m="$INBOX/manifest-${TAG}.json"
  a="$INBOX/tokens-${TAG}.zip.age"
  curl -fsSL "$MANIFEST_URL" -o "$m"
  curl -fL "$ASSET_URL" -o "$a"

  EXPECTED=$(jq -r '.sha256' "$m")
  GOT=$(sha256sum "$a" | awk '{print $1}')
  [ "$EXPECTED" = "$GOT" ]

  zip="$WORK/tokens-${TAG}.zip"
  age -d -i "$AGE_IDENTITY" -o "$zip" "$a"

  out="$WORK/unzipped-${TAG}"
  rm -rf "$out" && mkdir -p "$out"
  unzip -o "$zip" -d "$out" >/dev/null

  cp -n "$out/codex"/*.json "$DEST"/ || true
  chmod 600 "$DEST"/*.json 2>/dev/null || true

  LAST="$T"
  PROCESSED=$((PROCESSED+1))
  [ "$PROCESSED" -ge "${MAX_PER_RUN:-20}" ] && break

done

jq -n --arg last "$LAST" '{last_published_at:$last}' > "$STATE"
```

## 全量检测：用真实请求探测 token 是否失效

同步只是“把文件拉下来”，维护的核心其实是“判断可用性”。最稳的方法是：**对每个 token 做一次真实请求探测**。

一个常用的做法是请求 usage/quota 接口，例如：

`GET https://chatgpt.com/backend-api/wham/usage`

然后按 HTTP 状态码分类：

- `200`：可用
- `401`：失效（invalidated 这类错误），建议直接删除
- `402`：无额度（是否删除看策略，通常先只统计）
- 其他：只统计，后续排查

检测脚本要注意节流与超时：

```bash
#!/usr/bin/env bash
set -euo pipefail

AUTH_DIR="/opt/cli-proxy-plus/auths"
SLEEP_SEC="${SLEEP_SEC:-0.2}"
TIMEOUT_SEC="${TIMEOUT_SEC:-12}"

total=0; ok=0; invalid_401=0; no_quota=0; other=0

for f in "$AUTH_DIR"/*.json; do
  [ -f "$f" ] || continue
  total=$((total+1))

  # 这里的 token 读取方式按你 auth json 的字段来（示例用占位）
  token=$(jq -r '.access_token // empty' "$f" 2>/dev/null || true)
  [ -n "$token" ] || { other=$((other+1)); continue; }

  code=$(curl -sS -m "$TIMEOUT_SEC" -o /tmp/usage.$$ -w '%{http_code}' \
    -H "Authorization: Bearer $token" \
    "https://chatgpt.com/backend-api/wham/usage" || echo 000)

  case "$code" in
    200) ok=$((ok+1)) ;;
    401) invalid_401=$((invalid_401+1)); rm -f "$f" ;;
    402) no_quota=$((no_quota+1)) ;;
    *) other=$((other+1)) ;;
  esac

  sleep "$SLEEP_SEC"
done

echo "total=$total ok=$ok invalid_401=$invalid_401 no_quota=$no_quota other=$other"
```

## 最后：通过 Telegram 汇报（多行不截断）

TG 汇报建议只发统计，不传任何 token 内容。多行消息不截断的关键是：

- 用 `MSG=$(cat <<EOF ... EOF)` 生成多行
- 用 `curl --data-urlencode "text=$MSG"` 发送

```bash
MSG=$(cat <<EOF
[token-maintain hourly]
新增: ${NEW}
同步后总数: ${TOTAL}
检查结果: total=${TOTAL} ok=${OK} invalid_401=${BAD401} no_quota=${NOQ} other=${OTHER}
已删除401: ${BAD401} 剩余: ${REMAIN}
EOF
)

curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TG_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "disable_web_page_preview=true" >/dev/null || true
```

---

这套流程跑通之后，你得到的是一种很“工程化”的稳定感：

- 公开仓库也能安全发布（Release 上只有密文）
- VPS 自动同步与自清洁（401 直接剔除）
- 每小时一条 TG 摘要（知道系统还在工作）

如果你要把它进一步产品化，下一步通常是把“检测/删除策略”从硬编码变成配置，把异常（other/timeout）引入重试与隔离机制。但在大多数场景里，上面这个版本已经足够稳定、足够可维护。

#GitHubActions #age #Systemd #DevOps #Telegram #Security #Tokens
