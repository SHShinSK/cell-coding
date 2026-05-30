# Cell Coding

> [한국어 README](README.md) | **English**

A biological programming paradigm for Physical AI, built on event-driven architecture.

Cell Coding is not a campaign to replace existing frameworks. It is an **extensible architecture model** that runs on top of `TypeScript`, `Python`, and `React`.

## One-liner

Decompose by **role**, declare boundaries with **membrane**, and connect systems through **signal**.

## Why it matters

- Physical AI systems mix sensing, reasoning, and actuation, which raises coupling quickly
- Classic OOP layers make real-time event flow hard to observe and validate
- Cell Coding expresses event-centric structure in domain terms and improves operational visibility

## Core concepts

- `Cell`: minimal unit of execution, single responsibility
- `Membrane`: input/output signal contract
- `Signal`: the only communication primitive between cells
- `Tissue/Organ/Organism`: complexity hierarchy
- `Nervous/Immune`: routing and recovery policy layers

## Goals (v0.x)

1. **Runtime first**: working event bus + contract validation
2. **Observability**: React Viewer for signal flow visualization
3. **Extensibility**: Python bridge for sensors and actuators
4. **Progressive DSL**: optional `.cell` syntax later

## Repository

- GitHub: https://github.com/SHShinSK/cell-coding
- Site: https://shshinsk.github.io/cell-coding/ *(after Pages deploy)*
- Issues: https://github.com/SHShinSK/cell-coding/issues
- Discussions: https://github.com/SHShinSK/cell-coding/discussions

## How to contribute

1. Check milestones in [ROADMAP.en.md](ROADMAP.en.md)
2. Read [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md)
3. Start with issues labeled `good first issue`

See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for details.

## Documentation

| Korean | English |
|--------|---------|
| [README.md](README.md) | [README.en.md](README.en.md) |
| [OPEN_SOURCE_CHARTER.md](OPEN_SOURCE_CHARTER.md) | [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md) |
| [ROADMAP.md](ROADMAP.md) | [ROADMAP.en.md](ROADMAP.en.md) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | [CONTRIBUTING.en.md](CONTRIBUTING.en.md) |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | (Korean primary; English summary in charter) |
| [SECURITY.md](SECURITY.md) | (Korean primary) |
| [ISSUE_LABELS.md](ISSUE_LABELS.md) | (Korean primary) |
| [rfcs/README.md](rfcs/README.md) | RFC process (Korean) |
| [PRESENTATION_OUTLINE.md](PRESENTATION_OUTLINE.md) | Launch deck outline (Korean) |

### Concept & specification (HTML)

- [cell-coding.html](cell-coding.html) — paradigm overview
- [개발명세서.html](개발명세서.html) — language specification v0.1
- [roadmap.html](roadmap.html) — implementation roadmap
- [Cell Coding Blueprint.html](Cell%20Coding%20Blueprint.html) — Physical AI blueprint

## License

Apache-2.0 — see [LICENSE](LICENSE).
