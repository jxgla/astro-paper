## 2026-07-06 - Task: Add GPT session converter quick entry
### What was done
- Added a GPT Session Converter card to the quick links area on both Chinese and English tools pages, with the button opening `https://gpt.410666.xyz/`.

### Testing
- `rg -n "gpt-session-converter|https://gpt\.410666\.xyz/|GPT Session Converter" src/pages/tools/index.astro src/pages/en/tools.astro` confirmed the card id, title, and target link exist in both tools pages.
- `git diff --check -- src/pages/tools/index.astro src/pages/en/tools.astro` completed successfully; Git reported only line-ending normalization warnings for the touched files.
- `npm run build` could not be executed because `npm` is not available in the current PowerShell PATH.

### Notes
- `src/pages/tools/index.astro`: added the Chinese quick-link card and external converter button.
- `src/pages/en/tools.astro`: added the English quick-link card and external converter button.
- `progress.md`: recorded this task, validation evidence, and the build environment limitation.
- Rollback: remove the newly added `gpt-session-converter` article blocks from both tools pages and remove this progress entry, or reverse-apply the current task diff from version control.

## 2026-07-23 - Task: Add aggregated cloud drive search quick entry
### What was done
- Added an aggregated cloud drive search card as the fifth quick-link card on both Chinese and English tools pages, opening `https://pansearch.410666.xyz/` in a new tab.
- Documented the bilingual titles, target, and desktop placement for future maintenance.

### Testing
- A PowerShell structure check confirmed both quick-link sections contain five cards in the expected order and `pansearch` is the fifth card, which places it at the start of the second desktop row.
- `Invoke-WebRequest -Method Head https://pansearch.410666.xyz/` returned HTTP 200.
- `git diff --check -- src/pages/tools/index.astro src/pages/en/tools.astro docs/tools-quick-links.md` completed successfully; Git reported only line-ending normalization warnings for the existing Astro files.
- The Astro build could not be run because `node`, `npm`, and `pnpm` are not available in the current PowerShell PATH and `node_modules/.bin` is absent.

### Notes
- `src/pages/tools/index.astro`: added the Chinese aggregated cloud drive search card to the quick links section.
- `src/pages/en/tools.astro`: added the English aggregated cloud drive search card to the quick links section.
- `docs/tools-quick-links.md`: documented the card placement, bilingual labels, target URL, and external-link behavior.
- `progress.md`: recorded the implementation, validation evidence, build limitation, and rollback method.
- Rollback: remove the `pansearch` article blocks from both tools pages, delete `docs/tools-quick-links.md`, and remove this progress entry, or reverse-apply the current task diff from version control.

## 2026-08-14 - Task: Add proxy format converter to productivity tools
### What was done
- Added a bilingual proxy format converter card that automatically recognizes common line-based proxy formats and regenerates the output when the selected layout or protocol prefix changes.
- Added newline-preserving copy-all and clear actions, invalid-line reporting, credential-omission reporting, IPv4/domain/bracketed-IPv6 handling, and local-only processing.
- Added the converter to the tools navigation and documented its accepted inputs, output choices, and credential behavior.

### Testing
- A Node/TypeScript function harness passed 10 assertions covering `host:port`, colon-auth, auth-first, protocol-prefixed, bracketed IPv6, invalid ports, invalid input, credential encoding, output layout, and prefix behavior.
- Playwright against the local Astro development server passed 8 desktop assertions for automatic conversion, mixed-format input, invalid-line reporting, format/prefix selection, copy-button state, newline-preserving clipboard output, and horizontal overflow; 4 mobile assertions confirmed conversion and a 390 px viewport without horizontal overflow.
- `astro check` completed against the current source snapshot: 84 files, 0 errors, and 0 warnings.
- `git diff --check` completed successfully; Git reported only existing line-ending normalization warnings for the touched tracked files.
- Prettier check passed for `src/scripts/tools/proxy-format-converter.ts`.
- The full `npm run build` completed Astro checks and the 107-module Vite client bundle, then failed during unrelated static OG-image generation because `fonts.googleapis.com` timed out; a complete production build could not be confirmed in this network environment.

### Notes
- `src/data/tools-nav.ts`: added the bilingual productivity navigation entry.
- `src/pages/tools/index.astro`: added the Chinese converter card and loaded its browser module before the existing TOML module.
- `src/pages/en/tools.astro`: added the English converter card and loaded its browser module before the existing TOML module.
- `src/scripts/tools/proxy-format-converter.ts`: added local proxy parsing, formatting, automatic conversion, copy, clear, validation status, and bilingual messages.
- `docs/proxy-format-converter.md`: documented supported input formats, output layouts, prefixes, and credential handling.
- `progress.md`: recorded implementation, validation evidence, the external build limitation, and rollback instructions.
- Rollback: run `git restore -- src/data/tools-nav.ts src/pages/tools/index.astro src/pages/en/tools.astro progress.md`, then remove `docs/proxy-format-converter.md` and `src/scripts/tools/proxy-format-converter.ts`.

## 2026-10-29 - Task: Add local 2FA viewer to productivity tools
### What was done
- Added the 2FA viewer to the Chinese and English productivity sections and tools navigation, matching the existing expandable card interaction.
- Added Base32 secret input, standard SHA1 / 6-digit / 30-second TOTP generation, countdown, automatic refresh, copy, clear, and invalid-input feedback. Computation stays in the browser without uploading or persisting secrets.
- Clear and Astro navigation cancel pending updates and release active key state. Updated local usage documentation and ignored new docs as required by repository instructions.

### Testing
- `node "$env:TEMP\astro-twofa-test.mjs"` passed all assertions for the six RFC 6238 Appendix B SHA1 vectors (last six digits), leading zeros, normalization, padded/unpadded Base32, invalid input and a 30-second boundary.
- `npx.cmd astro check`: 86 files, 0 errors, 0 warnings, 24 existing hints.
- ESLint and Prettier checks passed for both new TypeScript modules; `git diff --check` passed, with line-ending normalization notices only.
- Playwright against the local development server passed 17 assertions covering the RFC code, countdown, automatic boundary refresh, actual clipboard output, invalid input, normalization, clear, pending-import cancellation, unchanged browser storage, absence of the test secret in requests, clearing the old page on Astro navigation, English initialization and mobile layout at 390px.
- `npm.cmd run build` passed after the final styling adjustment: 83 static pages generated and Pagefind completed successfully. The build log is at `$env:TEMP\astro-twofa-build.log`.
- Playwright against the production preview on `127.0.0.1:4322` confirmed both language pages generate the RFC code, English refreshes at the boundary, the result uses the intended 32px font and mobile layout has no horizontal overflow.
- Existing development-only `@iarna/toml` browser error (`global is not defined`) was observed in the unrelated data toolbox. The new viewer works in both development and production; that dependency was left outside this task scope.

### Notes
- `.gitignore`: ignored new files under `docs/`; existing tracked docs and progress history remain tracked.
- `src/data/tools-nav.ts`: added the bilingual productivity navigation item.
- `src/pages/tools/index.astro`: added the Chinese viewer card, code styling and browser module import.
- `src/pages/en/tools.astro`: added the equivalent English card, styling and module import.
- `src/scripts/tools/totp.ts`: added validated Base32 decoding and standard Web Crypto TOTP calculation.
- `src/scripts/tools/twofa-viewer.ts`: added local input, refresh, countdown, clipboard, clear and page-transition lifecycle behavior.
- `docs/twofa-viewer.md`: documented supported secrets, algorithm, privacy behavior, runtime requirements and verification.
- `progress.md`: appended this implementation and validation record.
- Rollback from the repository root (PowerShell): run `git restore -- .gitignore src/data/tools-nav.ts src/pages/tools/index.astro src/pages/en/tools.astro progress.md`, then `Remove-Item -LiteralPath 'src/scripts/tools/totp.ts', 'src/scripts/tools/twofa-viewer.ts', 'docs/twofa-viewer.md'`. The repository was clean before this task; no commit or deployment was performed.
