---
title: OpenClaw Memory Archiving, Compression, Reset, and Recovery Workflow
pubDatetime: 2026-03-09T06:45:00Z
modDatetime: 2026-03-09T06:45:00Z
description: A direct explanation of OpenClaw’s current workflow for long-term memory archiving, compression, reset preparation, and post-reset recovery.
tags:
  - OpenClaw
  - Memory
  - Workflow
  - Reset
  - Archive
featured: true
draft: false
---

## 1. Purpose

This document records OpenClaw’s current workflow for long-term memory archiving, compression, pre-reset preparation, and post-reset recovery, so it can keep being used later without drifting.

After a round of work, a lot of information usually ends up scattered across chats, sessions, temporary files, and plain human memory. As time passes, that easily turns into situations like “we did this before, but can’t pick it back up” or “I remember this existed, but can’t find the proper entry point anymore.”

Once these workflows are written down in one place, future wrap-ups, handoffs, `/new`, and `/reset` can all follow the same process. You can tell where information should go, what still needs to be filled in, and where to resume when coming back.

> This document can be used directly as an execution guide.
> Memory updates, project wrap-up, reset preparation, and post-reset recovery should all follow the rules here.

---

## 2. Current Official Memory Structure

The current long-term memory is fixed into four layers:

- `sessions`
- `memory/*.md`
- `memory/topics/*.md`
- `MEMORY.md`

Their responsibilities are as follows.

### 2.1 sessions
- Stores raw chronological records
- Used for full replay
- Not intended for fast recovery
- Not used directly as long-term summaries

### 2.2 `memory/*.md`
- Stores date-level or project-level summaries
- Records high-value conclusions
- Records current status, key paths, key decisions, risks, and next steps
- Does not accumulate large raw logs
- Does not accumulate command-by-command history

### 2.3 `memory/topics/*.md`
- Stores topic-level overviews
- Compresses multiple `memory/*.md` files under the same topic into one more layer
- Represents the current official understanding of that topic
- Suitable for priority reading after a reset

### 2.4 `MEMORY.md`
- Used only as a long-term index
- Contains only dates, topics, one-line conclusions, tags, and paths
- Not written as long-form body content
- Does not repeat detailed content

One-sentence rule:

- sessions keep the raw record
- `memory/*.md` keep summaries
- `memory/topics/*.md` keep topic overviews
- `MEMORY.md` keeps only the index

---

## 3. What Should Go Into Long-Term Memory

The following content should go into `memory/` or `memory/topics/`:

- Key configuration changes
- New nodes or service integrations
- Newly implemented scripts or workflows
- Important troubleshooting conclusions
- Key decisions and why they were made
- Paths, entry points, and methods that are likely to be reused later
- Anything the boss explicitly says to “remember”
- The official status at project wrap-up

The following content should not go directly into long-term memory:

- Temporary trial-and-error process
- Unconfirmed guesses
- Large raw logs
- Continuous command history
- Casual chat
- Duplicate information
- One-off temporary file notes

---

## 4. Archiving Workflow

“Archiving” here means formally writing the parts of the current round of work that are truly worth keeping into the memory system, rather than leaving them only in chat.

### 4.1 Daily Archiving Triggers

If any of the following happens on a given day, it should be archived:

- A new service, node, or entry point
- A key configuration change
- A new workflow or rule is put in place
- An important troubleshooting conclusion
- The boss says “remember this”
- There is a high chance the work will continue within the next 7 days

If none of the above happens:

- Do not force a long summary
- Keeping the raw session is enough

### 4.2 Daily Archiving Steps

1. Review the key session or key file changes from that day
2. Extract the following:
   - What was done
   - Current status
   - Key paths
   - Key decisions
   - Risks / pitfalls
   - How to continue next time
3. Write it into `memory/YYYY-MM-DD.md`
4. Add an index entry in `MEMORY.md`
5. If it belongs to an existing topic, update the corresponding `memory/topics/*.md`

### 4.3 Large Project Archiving Steps

If the work involves cross-VPS, cross-claw, real deployment, real production launch, or long-term maintenance, use the large-project workflow:

1. Collect evidence
   - Official path
   - Official entry point
   - Official script
   - Current official status
2. Clean up junk
   - tmp
   - Temporary downloads
   - Temporary archives
   - One-off scripts
   - Debug leftovers
   - Miswritten files
3. Write a date summary into `memory/*.md`
4. Write or update a topic file in `memory/topics/*.md`
5. Update the `MEMORY.md` index
6. Confirm it has entered the backup pipeline

---

## 5. Compression Workflow

“Compression” does not mean deleting memory. It means organizing raw history into a structure that is easy to take over, reuse, and continue developing.

### 5.1 Anchors That Must Be Preserved During Compression

When compressing long-term memory, the following must not be lost:

1. Current official status
2. Official path / official entry point / official script
3. Key decisions and why they were made
4. High-frequency risks and pitfalls
5. How to continue next time
6. Traceback anchors (corresponding summary files or sessions)

### 5.2 Compression Triggers

If any of the following happens, a compression pass should be done:

- An important project is being wrapped up
- A topic has accumulated more than 3 `memory/*.md` files
- A single summary exceeds 150–200 lines
- `MEMORY.md` exceeds 120 lines
- A topic has entered long-term maintenance
- Before `/new`, `/reset`, handoff, or archive

### 5.3 Project-Level Compression Steps

1. Read the relevant sessions or daily summaries
2. Extract conclusions, status, anchors, and risks
3. Write them into `memory/YYYY-MM-DD.md` or a project summary file
4. Add an index entry to `MEMORY.md`

### 5.4 Topic-Level Compression Steps

1. Gather 3 or more date summaries under the same topic
2. Merge repeated conclusions
3. Converge them into the current official status
4. Write into `memory/topics/*.md`
5. Make `MEMORY.md` point to the topic file first

---

## 6. `MEMORY.md` Index Protocol

`MEMORY.md` should only keep:

- Date
- One-line conclusion
- Tags
- Corresponding path

Example format:

- **2026-03-08**: The long-term memory structure was consolidated into `sessions / memory / topics / MEMORY`, and `daily_chat/` was explicitly dropped as an official long-term record entry point. See `memory/2026-03-08.md` and `memory/RESET_REHAB.md`. #memory #reset

Prohibited actions:

- Do not turn `MEMORY.md` into a second body document
- Do not copy large sections from `memory/*.md` into `MEMORY.md`
- Do not pile logs, commands, or chat into `MEMORY.md`

---

## 7. The Current Role of `daily_chat/`

The current rule has already settled:

- `daily_chat/` is no longer used as an official long-term memory entry point
- Long-term information, archiving, backfilling, retrospectives, and topic compression should all be written into `memory/` or `memory/topics/`
- `MEMORY.md` remains index-only

Why:

- `daily_chat/` is closer to a daily process log
- If long-term content stays only in `daily_chat/`, later you run into “it was recorded, but never formally entered into the long-term structure”
- Long-term assets need to live in a layer that supports recovery, compression, and indexing

---

## 8. Pre-Reset Workflow

When preparing for `/new`, `/reset`, or when the context is obviously getting too heavy, follow the steps below.

### 8.1 Pre-Reset Checklist

1. Confirm that important conclusions from the day have already entered `memory/` or `memory/topics/`
2. Confirm that `MEMORY.md` already has the relevant index entry
3. Confirm that any topic that needs to be kept long-term has been updated
4. Update `memory/RESET_REHAB.md`
5. Only then perform the reset

### 8.2 Minimum Actions Before Reset

If time is tight, do at least these 4 steps:

1. Update `memory/YYYY-MM-DD.md` (if there was important progress today)
2. Add an index entry in `MEMORY.md`
3. Update `memory/RESET_REHAB.md`
4. Then reset

### 8.3 Prohibited Actions Before Reset

- Do not reset before important information has been written down
- Do not leave important conclusions only in session history
- Do not assume “I remember it” means the memory has already been archived

---

## 9. Post-Reset Recovery Workflow

After a reset, do not start by scrolling old sessions. The current official approach is to start from the recovery entry point.

### 9.1 Reading Order

Read in this order:

1. `MEMORY.md`
2. `memory/topics/*.md`
3. `memory/YYYY-MM-DD.md`
4. sessions

### 9.2 Why This Order

#### Read `MEMORY.md` first
Use it to quickly locate what long-term topics currently exist, what important changes happened recently, and where to continue reading.

#### Then read `topics`
Use them to restore the current official understanding quickly, instead of getting trapped in date-based history.

#### Then read date summaries
Use them to fill in the recent evolution details.

#### Only replay sessions at the end
Go into session history only when raw evidence or full context is actually needed.

### 9.3 Minimum Recovery Actions

If time is tight after reset, the minimum is:

1. Read `MEMORY.md`
2. Read `memory/topics/backup.md`
3. Read `memory/topics/team-claw-map.md`
4. Then read the topic that matches the current issue

---

## 10. The Role of `RESET_REHAB.md`

`memory/RESET_REHAB.md` is not a complete history. It is a recovery entry point.

Its responsibilities are:

- Telling you what to read first after reset
- Telling you what the most important long-term topics currently are
- Telling you which topic to jump to for different problems
- Telling you what the minimum recovery action is

It does not replace `memory/*.md`, `topics`, or sessions.

Its job is to shorten the reading path after reset.

---

## 11. The Relationship Between Backups and the Memory System

Current long-term retention has already shifted to a two-track structure:

- Workspace whitelist backup
- Incremental session backup

Why:

1. The entire workspace is no longer synced, to avoid junk, cache, and mistakenly downloaded projects polluting long-term backups
2. Raw details are handled through session replay
3. High-value long-term information goes into `memory/`
4. Keeping only `MEMORY.md` is not enough, because that leads to “an index pointing to empty air”

Current principles:

- session handles raw replay
- `memory/` handles compressed summaries
- `topics` handle topic overviews
- `MEMORY.md` handles entry-point discovery
- backups make sure these official assets do not get lost

---

## 12. Supplemental Rules for Stage Wrap-Up

It has now been formally fixed that after each claw finishes a project or stage, it must proactively complete the following:

1. `archive`
2. `retro`
3. `cleanup`

A stage receipt should include at least:

- `archive_written=yes/no`
- `retro_written=yes/no`
- `cleanup=yes/no`
- `leftover=none/...`

The meaning of this rule is:

- Without evidence, it does not count as completed
- Without archiving, it does not count as a long-term asset
- Without cleanup, it does not count as properly wrapped up

---

## 13. One-Line Execution Version

### Daily Version
> Important progress happened → write `memory/YYYY-MM-DD.md`  
> Add an index entry in `MEMORY.md`  
> If there is an existing topic → update the corresponding topic

### Project Wrap-Up Version
> Collect evidence first  
> Clean up junk next  
> Then write `memory/`  
> Then write / update `topics`  
> Then update `MEMORY.md`  
> Finally confirm it is in backup

### Pre-Reset Version
> First confirm important information has been written down  
> Update `MEMORY.md`  
> Update `RESET_REHAB.md`  
> Then reset

### Post-Reset Version
> Read `MEMORY.md` first  
> Then read `topics`  
> Then read date summaries  
> Look at sessions only at the end

---

## 14. Current Overall Principles

The overall principles of the memory system are now fixed as follows.

1. Text > Brain
2. sessions keep the raw record
3. `memory/*.md` keep summaries
4. `memory/topics/*.md` keep topic overviews
5. `MEMORY.md` keeps only the index
6. Long-term information goes into `memory/` in a unified way; `daily_chat/` is no longer treated as an official long-term entry point
7. Before reset, update memory first, then update the recovery entry point
8. After reset, go through topics first instead of starting from old sessions
9. When a project ends, cleanup comes first, then archiving, then retrospective
10. Without evidence, it does not count as formally completed

#OpenClaw #Memory #Workflow #Reset #Archive