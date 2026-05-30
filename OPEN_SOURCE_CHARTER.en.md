# Cell Coding Open Source Charter

> [한국어 헌장](OPEN_SOURCE_CHARTER.md) | **English**

## Mission

Build an open event architecture for Physical AI based on **role, boundary, and signal**, so systems are safer, observable, and extensible.

## Vision

- A shared architecture standard, not a single-team framework
- One signal model for sensors, actuators, agents, and distributed systems
- Tools and runnable demos over philosophy-only docs

## In scope

- TypeScript runtime (signal bus, membrane validation, error policies)
- Python bridge (sensor/actuator adapters)
- React Viewer (signal flow and cell state)
- Experimental `.cell` DSL and transpiler
- Reference examples

## Out of scope

- Vendor-locked hardware SDKs as core design
- Forcing a full language rewrite
- Large untested rewrites
- PRs that only add abstract concepts

## Principles

1. **Execution first** — working code and reproducible demos
2. **Gradual adoption** — works alongside existing codebases
3. **Contract first** — membrane violations caught early
4. **Observability** — signal paths traceable in production
5. **Openness** — decision logs and rationale public

## Governance (initial)

**BDFL + Core Maintainers** for the first 3–6 months.

- BDFL: vision and final conflict resolution
- Core Maintainers (≥2): review, release, RFC facilitation

Transition to a maintainer committee when: 10+ active external contributors and 30+ external PRs per month.

## Decision process

- Minor: issue discussion + maintainer approval
- Medium: mini RFC + 1 week public comment
- Breaking: full RFC + migration path + ≥2 weeks notice

## Release policy

- 2-week sprints
- Monthly minor releases (`v0.x.y`)
- New features behind `experimental` when needed
- Breaking changes: deprecate for at least one version before removal

## 90-day success metrics

- 300+ GitHub stars
- 30+ external PRs
- 10+ active contributors
- 5+ example apps
- Issue first response within 72 hours (target)

## Charter amendments

- Agreement of ≥2 Core Maintainers
- 7+ days public notice
- Document rationale and impact
