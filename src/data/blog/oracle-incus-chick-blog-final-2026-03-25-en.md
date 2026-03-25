---
title: "Don’t Force PVE onto Oracle ARM: How I Split One Host into Two Maintainable Mini VPSes with Incus Routed"
pubDatetime: 2026-03-25T10:00:00Z
modDatetime: 2026-03-25T10:00:00Z
description: "When nested KVM isn’t available on Oracle ARM, forcing PVE usually creates more complexity than value. In this setup, I used a Debian host plus Incus routed containers to split one machine into two lighter, more stable, and much easier-to-maintain mini VPS-style nodes."
tags: [Oracle Cloud, ARM, Incus, Debian, Zero-Trust, Operations]
featured: true
draft: false
---

When I first got an Oracle ARM machine, my instinct was the same as everyone else’s: if the box had decent resources, why not install PVE, run KVM, and carve one bigger machine into several smaller ones?

But after going through the whole process, I came away with a much clearer conclusion: **on Oracle ARM-like environments, don’t rush into building everything around KVM.**

The reason is simple. You may feel like you’re following a “standard virtualization path,” but once nested KVM is unavailable underneath, a lot of the work that follows slowly turns into wasted effort. It’s not that you can’t keep pushing. It’s that the path itself is no longer a good fit.

What I finally settled on was much simpler: **a Debian host plus Incus routed containers**. One host, two routed containers, and the result turned out to be more stable, lighter, and far better suited for long-term maintenance than my original plan.

The final structure was straightforward:

- 1 host: Debian ARM64
- 2 routed containers: Chick1 / Chick2

In other words: **1 host + 2 mini VPS-style chicks**.

In this post, I want to walk through why I ended up with this design, what the real pitfalls were, and how I handled both networking and security so the setup was not just usable, but maintainable.

## Start by checking the real capability boundary

One of the easiest traps in infrastructure work is confusing “the package installs successfully” with “the feature is actually usable.” In Oracle ARM environments, what really decides the direction is not whether the software stack looks available, but whether the underlying capability is truly there.

So my recommendation now is to be very direct from the beginning:

- Check whether the KVM-related device nodes exist
- Verify whether the kernel modules and virtualization capability are actually available
- If the key capability is missing, stop early instead of stacking more complexity on top

This sounds obvious, but it saves a lot of time.

Because once you’ve confirmed that nested KVM is not an option, continuing to force PVE/KVM usually leads to a very predictable outcome: more packages, more moving parts, more fragmented troubleshooting, and not much more real stability.

In hindsight, what I actually wanted was not “it must be a VM.” What I really needed were only two things:

- isolation
- an operational experience that feels like independent nodes

And if those two goals can be achieved, containers are not a compromise at all.

## Why I chose routed instead of settling for a basic container setup

If your only goal is to run services, NAT-based containers are already enough.

But that’s not really what “splitting a machine into mini VPSes” means. In practice, the goal is to get several smaller nodes with clean boundaries, separate responsibilities, and a management model that still feels sane later.

At least for me, the important parts were these:

- each chick should carry different workloads independently
- login, updates, and access control should be handled separately
- external access should feel natural, instead of routing everything back through the host with a pile of port mappings

That is exactly where the routed model becomes valuable:

- the host keeps its own public IP
- each routed container gets its own public IP
- operationally, each one behaves much more like an independent machine

That is the core reason I ended up using Incus routed. It didn’t feel like a fallback. It felt like the cleaner, more realistic solution for the environment I actually had.

## Final topology: one Host and two Chicks

The structure itself was very simple:

```text
          Internet
             |
      (Host public IP)
           [Host]
        Debian + Incus
             |
      routed forwarding
        /              \
 (Chick1 public IP) (Chick2 public IP)
      [Chick1]           [Chick2]
    Service / App A    Service / App B
```

What mattered more than the diagram, though, was defining the roles early:

- **Host**: Incus management, routed support, necessary forwarding control, and the base for backup, monitoring, and unified operations
- **Chick1 / Chick2**: separate workloads and isolated runtime environments, keeping application complexity inside the containers

The host should remain the control plane, not become a junk drawer for everything.

That one mindset makes a surprising number of later decisions easier.

## A container that boots is only the beginning

One of the biggest false positives in this kind of setup is the feeling that things are “basically done” once the container starts successfully.

For example:

- it boots
- it has an IP
- it replies to ping
- it looks reachable

But all that really tells you is that the container is alive. It does **not** mean it is already a maintainable mini node.

For routed containers, the more useful acceptance checklist is much more practical:

- is outbound connectivity stable, not just occasionally working?
- can package management update and install dependencies normally?
- can it be managed independently over SSH?
- can security controls be applied in a clean and unified way?

Most of the real problems I ran into were in that gap between “it technically works” and “it can be maintained without pain.”

## Pitfall 1: it looks like DNS, but the host’s forwarding or firewall is often the real blocker

I ran into a very typical state:

- the container could ping the internet
- but HTTPS and other TCP traffic were unstable
- `apt update` looked like it should work, yet still stalled or failed in weird ways

At that point, it’s natural to start checking inside the container first:

- is DNS correct?
- is the mirror broken?
- did `resolv.conf` get overwritten?

Those are valid checks, but there’s an important reality in routed mode: **the host is part of the network path.**

If the host’s forwarding rules or firewall policy are not aligned with routed traffic, you get a very misleading “half-working” state:

- ICMP works
- the TCP traffic you actually care about gets blocked on the host layer

So my troubleshooting flow for this kind of issue now looks like this:

1. check routing, DNS, and basic outbound behavior inside the container
2. check forwarding and firewall behavior on the host, especially whether routed traffic is explicitly allowed
3. verify the container’s public IP behavior again from an external perspective

Once the host is included in the investigation, these “mysterious” network issues usually stop being mysterious.

## Pitfall 2: if HTTPS still fails after networking is fixed, stop blaming routing alone

There was another issue that looked like a networking problem at first, but really wasn’t.

Even after the main network path was corrected, HTTPS could still fail, certificate trust could still break, and package management over HTTPS could still behave badly.

That does not always mean there is still a routing problem.

Sometimes a freshly initialized container simply does not have a complete enough baseline to be comfortably maintainable yet, especially around certificate-chain-related components. When that happens, the symptoms can look almost identical to “the network is still broken.”

The safer approach is usually:

- temporarily switch to a trusted HTTP source for the initial bootstrap
- install the certificate-chain and crypto basics, such as `ca-certificates` and `openssl`
- switch back to HTTPS afterward

Only after this step does the system really enter a healthy, maintainable state.

## Pitfall 3: Zero-Trust hardening is not a bonus step

Once you split one machine into two chicks, you are not just adding two nodes. You are also expanding your exposure surface:

- more nodes
- more externally reachable endpoints
- one more forwarding layer on the host

If you leave hardening for “later,” every future change becomes heavier than it should be:

- which ports are actually necessary?
- which rules are just leftovers?
- which settings might affect routed traffic?

I found it much better to treat security closure as part of the definition of done, and to keep the host and chicks aligned as much as possible:

- keep SSH on a single high port
- close default ports
- use key-only authentication
- default-deny inbound traffic and allow only what is necessary
- enable basic brute-force protection such as fail2ban

The same principle applies to forwarding on the host side. The goal is not to disable everything blindly, but to keep only the forwarding paths the workload truly needs and remove the rest.

The more disciplined this is at the beginning, the more stable the setup becomes over time.

## Final takeaway

Looking back, the most valuable part of this whole setup was not “I managed to get the containers running.” It was that the important judgments turned out to be the right ones:

- confirm the capability boundary early
- use routed so the containers behave more like real independent nodes
- treat host forwarding and firewall as part of the network path
- fix the certificate-chain baseline so the system becomes maintainable
- make Zero-Trust hardening part of the finish line, not an appendix

So if you’re also trying to split one Oracle ARM machine into two mini VPS-style nodes, my advice is simple:

**don’t waste your energy forcing a KVM assumption that the environment does not really support.**

If your actual target is “two independent, clean, long-term maintainable nodes,” then Incus routed is often the lighter, steadier, and much less frustrating answer.

---

#OracleCloud #ARM #Incus #Debian #Zero-Trust #Operations
