---
title: "Secure Token Delivery from a Public Repo: GitHub Actions + age-encrypted Releases + VPS Auto-Health & Cleanup"
pubDatetime: 2026-03-15T19:30:00Z
modDatetime: 2026-03-15T19:30:00Z
description: "Generate tokens in GitHub Actions, publish only age-encrypted bundles to Releases, and let a VPS sync, probe, purge invalid tokens, and report to Telegram."
tags: [github-actions, age, systemd, devops, security, telegram, tokens]
featured: false
draft: false
---

If you generate tokens frequently (sometimes dozens of runs per day) and your repository must remain public, “just zip it and send it somewhere” quickly becomes a security and operations mess.

This post describes a practical end-to-end pipeline that keeps secrets safe while staying highly automated:

**Token factory → encrypted publishing → VPS sync → health probing → purge invalid tokens → Telegram report**.

All sensitive values are removed; anything secret is shown as placeholders.

## The core idea: publish ciphertext artifacts, never plaintext

Treat tokens as build artifacts:

- GitHub Actions generates `codex/*.json`.
- The runner zips them into `tokens.zip` (plaintext exists only inside the runner’s ephemeral workspace).
- The runner encrypts it with **age** into `tokens.zip.age` (safe to publish publicly).
- A VPS downloads the encrypted bundle, verifies integrity, decrypts locally, and appends files into the live auth directory.

This is why a public repo is still OK: the Release only contains ciphertext.

## Part A — GitHub Actions: generate → zip → encrypt → publish

### What you configure

In GitHub Actions **Secrets** (or Variables), provide:

- `AGE_RECIPIENT`: your age *public key* (`age1...`). Public keys are not sensitive.
- Optionally: `TG_BOT_TOKEN`, `TG_CHAT_ID` for a lightweight “generated” notification.

In the workflow, keep:

```yaml
permissions:
  contents: write
```

So `${{ github.token }}` can create Releases and upload assets without an extra PAT.

### Tag strategy: make every run unique

If you run often, avoid `tokens-YYYYMMDD` tags. Use something like:

`tokens-YYYYMMDD-HHMMSS-r<RUN_NUMBER>-a<RUN_ATTEMPT>`

### Example workflow

```yaml
name: Daily Task Job

on:
  schedule:
    - cron: "*/40 * * * *"
  workflow_dispatch:
    inputs:
      count:
        description: "How many accounts to register"
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

## Part B — Release cleanup: keep only the last 6 hours

High-frequency publishing needs aggressive cleanup. Run this every 15 minutes and delete `tokens-*` releases older than 6 hours:

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

## Part C — VPS sync: download → verify → decrypt → append

A VPS syncer should:

- list `tokens-*` releases;
- download `manifest.json` + `tokens.zip.age`;
- verify sha256;
- decrypt locally using the age private key;
- unzip and append `codex/*.json` into the auth directory (e.g., `/opt/cli-proxy-plus/auths/`).

Using `published_at` for incremental sync tends to be more robust than `created_at` under high-frequency releases.

## Part D — Full health probe + purge invalid tokens

After syncing, you still need to know which tokens are usable. The most reliable approach is a real request probe, for example:

`GET https://chatgpt.com/backend-api/wham/usage`

Then classify by HTTP status:

- 200 → OK
- 401 → INVALID (purge)
- 402 → NO_QUOTA (usually keep but report)
- others → OTHER (report only)

Throttle and set timeouts to avoid upstream rate-limits.

## Part E — Telegram report (multi-line, no truncation)

Telegram is for reporting stats, not distributing secrets.

To avoid “only first line arrives” issues:

- build multi-line text with `MSG=$(cat <<EOF ... EOF)`
- send with `curl --data-urlencode "text=$MSG"`

#GitHubActions #age #Systemd #DevOps #Telegram #Security #Tokens
