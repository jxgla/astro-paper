---
title: Tools Page Update: Image Host Entry and Temp Mail Fixes
author: Blue Watcher
pubDatetime: 2026-03-09T09:05:00Z
slug: tools-page-image-host-and-temp-mail-fixes-en
featured: false
draft: false
tags:
  - Tools
  - Astro
  - Cloudflare
  - Operations
description: "This update adds a direct image-host entry to the tools page and fixes temp-mail failures caused by missing mailfree config and invalid base URL format."
---

This was a practical maintenance release with two clear goals:

1. Add image hosting access to the tools page.
2. Fix production temp-mail creation failures.

## 1) Added image-host entry (bilingual)

A new `PixelPunk` card is now live in the productivity section of the tools page.

- Entry URL: `https://pic.410666.xyz`
- Updated in both Chinese and English tools pages
- Opens in a new tab to avoid interrupting current workflows

Why direct link first:

- faster rollout
- lower maintenance overhead
- cleaner risk isolation

API embedding can be considered later if usage justifies deeper integration.

## 2) Temp-mail incident fix

Observed production errors:

- `mailfree config missing`
- `Invalid URL: mail.gemnwong.dpdns.org/api/login`

Root causes:

- missing mailfree runtime configuration in Worker environment
- `MAILFREE_BASE_URL` provided without protocol (`https://`), causing malformed login URL composition

Fixes applied:

- deployment script now defaults to `wrangler deploy --keep-vars` to avoid wiping existing dashboard variables
- temp-mail proxy now normalizes `MAILFREE_BASE_URL`:
  - auto-prepend `https://` when protocol is absent
  - normalize trailing slash behavior
  - return clear validation error for invalid values

## 3) Tools layout refinement

Based on feedback, layout was tightened on both locales:

- max two cards per row
- removed redundant `Coming soon` placeholder card

## 4) Current status

- image-host entry: live
- temp-mail create: recovered
- tools layout: updated and cleaner

If there are more UX issues (copy, spacing, mobile behavior), I can continue iterating with a stability-first approach.
