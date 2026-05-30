# Contributing to Cell Coding

> [한국어 기여 가이드](CONTRIBUTING.md) | **English**

Thank you for contributing. This project values **reproducible execution** over abstract philosophy.

## Principles

- Contribute in small, frequent increments
- Improve at least one of: behavior, tests, or docs
- Do not make breaking changes without an RFC

## Getting started

1. Pick an issue labeled `good first issue` or `help wanted`
2. Comment on the issue to share your intent
3. Fork, create a branch, and open a PR

Branch examples:

- `feat/runtime-signal-priority`
- `fix/viewer-node-leak`
- `docs/quickstart-en`

## Issue types

- `bug`: reproducible defect
- `feature`: feature proposal
- `rfc`: design or policy change
- `docs`: documentation improvement
- `question`: usage or design question

## Pull request checklist

Include:

- Why the change is needed
- What changed
- Impact area (runtime / bridge / viewer / DSL / docs)
- How to verify (tests or manual steps)
- Risks and rollback plan (if needed)

Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.

## When an RFC is required

- DSL syntax changes
- Runtime semantics changes
- Public API removal or rename
- Release or versioning policy changes

See [rfcs/README.md](rfcs/README.md).

## Code of conduct

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report violations to maintainers privately.
