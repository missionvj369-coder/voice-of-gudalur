# Open Civic Signature Protocol — Governance

## Project Governance

The Open Civic Signature Protocol is developed as part of the Voice of Gudalur project. This document describes how the protocol is governed as it evolves toward potential extraction as an independent open-source project.

## Current State

The protocol is currently **embedded** within the Voice of Gudalur codebase:

- It lives under `server/services/identity/` and related modules.
- Changes are reviewed as part of the main project's pull request process.
- The Voice of Gudalur team maintains the code.

## Maintainers

The current maintainers are the Voice of Gudalur development team. As the protocol matures and potentially extracts into its own project, a separate maintainer structure may be established.

## Contribution Guidelines

### How to Contribute

1. Fork the repository.
2. Create a feature branch.
3. Make your change with tests.
4. Ensure all tests pass (`npm test`).
5. Ensure TypeScript compiles cleanly (`npx tsc --noEmit`).
6. Submit a pull request.

### Code Standards

- All code must be in TypeScript.
- All public APIs must have JSDoc comments.
- All changes must include or update tests.
- No secrets in source code.
- No breaking changes to the protocol specification without documentation.

### Review Process

- All pull requests require review by at least one maintainer.
- Security-sensitive changes require additional scrutiny.
- Protocol specification changes require documentation updates.

## Decision Making

Decisions about the protocol are made by the maintainers with input from the community. The decision-making process:

1. **Proposals** — anyone can propose changes via GitHub issues.
2. **Discussion** — community and maintainers discuss the proposal.
3. **Decision** — maintainers make the final call.
4. **Documentation** — decisions are documented in the relevant specification.

## Protocol Versioning

The protocol follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — incompatible changes to the protocol interface.
- **MINOR** — backward-compatible additions.
- **PATCH** — backward-compatible bug fixes.

Current version: **0.1.0** (initial draft).

## Extraction Plan

When the protocol is mature enough for extraction:

1. The `server/services/identity/` module and related code will be moved to a separate repository.
2. The new project will have its own maintainer team.
3. The Voice of Gudalur project will consume the extracted package.
4. The protocol specification will be finalized at version 1.0.0.

## License

This project is licensed under the **MIT License**.

### Why MIT?

- Simple and widely understood.
- Permissive — allows use in any context (including commercial).
- Compatible with the open-source ecosystem.
- Does not impose copyleft requirements on derivative works.

### Alternative Considered: Apache-2.0

Apache-2.0 provides additional patent protection, which is valuable for network/protocol software. If the protocol matures and attracts patent-sensitive contributors, the license may be re-evaluated.

## Code of Conduct

All participants are expected to:

- Be respectful and constructive.
- Focus on technical merit.
- Welcome newcomers.
- Respect privacy and security concerns.

## Dispute Resolution

Disputes are resolved by the maintainers. If a dispute cannot be resolved internally, mediation by a neutral third party may be sought.

## Contact

For governance questions, open a GitHub issue in the Voice of Gudalur repository.
