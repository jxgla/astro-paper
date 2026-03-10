---
title: "How I Turned a Few VPS-Based OpenClaw Nodes into a Real Workflow with Tailscale"
pubDatetime: 2026-03-08T15:30:00Z
modDatetime: 2026-03-08T15:30:00Z
description: "This is not a multi-bot group chat demo, but a real multi-machine workflow built with Tailscale and a constrained task bus."
tags: [OpenClaw, Tailscale, Multi-Agent, VPS, Automation, Operations]
featured: false
draft: false
---

A single agent feels great when you are just experimenting. The moment you start splitting real work across machines, though, the problem stops being about the model and starts being about coordination.

One machine collects material, one reviews it, one handles the final expression, and another one owns orchestration, nudging, and closeout. Once those responsibilities live on separate VPS nodes, the real questions become much more practical: how the machines talk to each other, how tasks move forward, how files are handed off, how blocking gets surfaced, and how the controller knows when a step is actually done.

That was the real point of this build. I was not trying to make a few agents talk to each other for fun. I was trying to turn that setup into a multi-machine workflow. The final shape is not fancy: **Tailscale connects the machines into one private network, and a constrained task bus carries tasks, attachments, and status.**

## The point is not “many bots talking at once”

When people hear “multi-agent,” they often picture a room full of bots replying to each other.

That looks lively, but it breaks down quickly in real engineering work. Responsibilities get blurry, intermediate artifacts go missing, status becomes hard to trust, and in the end it looks like everything is moving while nobody is actually delivering anything.

So I collapsed the system into four fixed roles:

- `main`: orchestration, dispatch, nudging, validation, and closeout
- `nano`: first-pass research and raw material
- `sg`: review and structural convergence
- `jp`: final expression and acceptance

Once the roles are clear, the system gets easier to reason about. This is not group chat. It is relay work.

## Why I chose Tailscale as the base layer

The reason is simple: I did not want to expose a pile of coordination ports to the public internet just to let a few machines cooperate.

What Tailscale gives me is not “something cool.” It solves the messier and more important problem first: **it pulls scattered machines into one controlled private network.**

That means each node can bind its task-bus listener to a tailnet address instead of opening it publicly:

- `main -> XXXX:18100`
- `nano -> XXXX:18101`
- `sg -> XXXX:18102`
- `jp -> XXXX:18103`

That separation matters. Human-facing services can keep using public entry points or Tunnel. Machine-to-machine coordination can stay on the internal network.

## Why the task bus is intentionally constrained

I never wanted this to become a remote control platform.

Right now the bus only does four things:

- `POST /task`
- `POST /upload`
- `GET /status`
- `GET /health`

In plain terms, it accepts tasks, accepts attachments, reports status, and does not perform remote execution.

That limit is deliberate. In early multi-machine systems, the biggest risk is usually not “not enough automation.” It is opening the execution surface too early. If the boundaries are still fuzzy and nodes can already call into each other freely, the system gets messy fast, and the security story gets worse even faster.

So the first-stage goal is intentionally narrow: **make messages, attachments, and status reliable first; add more capability later.**

## This is already past the idea stage

At this point, the system has real directories, real consumers, and real outputs.

Each machine has the same basic structure:

- `inbox/`
- `artifacts/`
- `archive/`
- `logs/`

And the key consumers are already in place:

- `de_consumer.py`
- `sg_consumer.py`
- `jp_consumer.py`

The relay path is also real and already working end to end:

`main -> nano -> sg -> jp -> main`

More importantly, this is not just something that “seems to work.” There are actual intermediate artifacts on disk:

- `candidate-list.md`
- `de-raw-output.txt`
- `sg-review.md`
- `jp-final.txt`

That is why I care more and more about one thing: **evidence.**

In a multi-machine workflow, no files, no logs, and no verifiable acknowledgment means no real progress. That rule sounds strict, but once more nodes get involved, it becomes one of the easiest ways to avoid fake progress.

## The most valuable part was not success, but the mistakes

If all I say is “we built multi-machine collaboration,” this post is not worth much. The useful part is what broke and what that taught me.

The first mistake was treating a cross-machine team like local subagents.

Those two setups may both sit under the broad label of “multi-agent,” but they are not the same thing. Local subagents behave like branches inside one runtime. `main / nano / sg / jp` are independent nodes distributed across different machines. Dispatch, observability, and failure handling all work differently.

The second mistake was confusing “delivered” with “done.”

A file landing in `inbox`, or even being marked processed, does not mean the step actually produced a usable result. Real progress only starts when artifacts are written, status comes back, and the chain closes cleanly.

The third mistake was that old bridge-style shortcuts always disguise themselves as the shortest path.

When time is tight, it is very tempting to fall back to the old habit: SSH into a node, drop JSON into its `inbox`, and move on. That does get the task there, but it does not give you a proper loop. Acknowledgment, status, escalation, and auditability all get weaker.

The fourth mistake was the one that stuck with me the most: **using the right transport is not enough if you break the contract.**

At one point I manually took over the `nano` step. I thought switching to Tailscale `/upload + /task` was enough. It was not. I also changed the attachment naming on my own and turned it into a new research pack format. But `sg_consumer.py` only knew how to consume the original fixed filenames, so even though the task arrived, the consumer still blocked.

That locked in a rule for me:

> Manually taking over one stage does not give you permission to invent a new intermediate protocol. You still have to feed the existing consumer what it already expects.

Once I switched back to the standard format, the chain recovered and `sg -> jp -> main` completed normally.

## How I think about this system now

If I had to compress the whole experience into one sentence, it would be this:

**The interesting part is not that a few agents on different machines can finally talk to each other. The interesting part is that multi-machine collaboration is starting to look like an engineering workflow: verifiable, handoff-friendly, and closeable.**

That is the real difference between a demo and a working system.

Demo systems optimize for “this looks smart.” Engineering systems care more about:

- whether there is evidence
- whether responsibility is explicit
- whether task state is visible
- whether intermediate artifacts exist
- whether blocked work can be recovered
- whether the whole thing can actually be closed cleanly

None of that sounds romantic. In practice, it matters far more than simply making the agents sound impressive.

## What still needs work

This chain is working, but it is not stable yet.

At minimum, the next layer still needs:

- clearer timeout and escalation behavior
- stricter ACK and delivery rules
- finer ACL boundaries
- more stable attachment contracts
- better audit trails

Tailscale is the base layer. The task bus is the first skeleton. A mature multi-machine collaboration system still needs to grow on top of both.

But even at this stage, one thing already feels clear: instead of trying to make more agents talk at once, it is far more useful to get **tasks, status, attachments, and closeout** right first.

That is what makes multi-machine collaboration move from “interesting to watch” to “actually usable.”

#OpenClaw #Tailscale #MultiAgent #VPS #Automation #Operations
