# Open Civic Signature Protocol

A reusable protocol for collecting authenticated signatures on civic petitions.

## Overview

The Open Civic Signature Protocol separates petition signing into composable layers:

- **Signature engine** — handles uniqueness, counting, and audit
- **Identity verification** — provider-agnostic verification interface
- **Provider adapter** — pluggable backends (CAMARA, self-asserted, future)

Voice of Gudalur is the first production reference implementation.

## Features

- **Uniqueness** — Database-enforced one-signature-per-identity per petition
- **Privacy** — Raw mobile numbers never stored; only HMAC hashes
- **Auditability** — Every operation logged with request correlation
- **Portability** — Provider-agnostic design allows switching providers
- **Resilience** — Self-asserted fallback when network provider is unavailable
- **Anti-bot** — Server-side Turnstile validation + signed challenges
- **Emergency mode** — Feature-flagged load shedding under extreme traffic

## Assurance Levels

| Level | Name | Claim |
|-------|------|-------|
| 0 | UNVERIFIED | No verification performed |
| 1 | ANTI_BOT | Passed anti-bot challenge |
| 2 | SELF_ASSERTED_MOBILE | Submitter confirmed control of mobile number |
| 3 | NETWORK_VERIFIED | Verified through network provider (CAMARA) |
| 4 | TRUSTED_CREDENTIAL | Trusted third-party credential (future) |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/missionvj369-coder/voice-of-gudalur.git
cd voice-of-gudalur

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CAMARA_MODE` | off/sandbox/production | off |
| `VERIFICATION_IDENTITY_SECRET` | HMAC key for identity hashing | required |
| `CF_TURNSTILE_SECRET` | Cloudflare Turnstile secret | optional |
| `CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | optional |
| `DATABASE_URL` | CockroachDB connection string | required |

## Protocol Flow

1. **Start verification** — allocate a single-use transaction
2. **Complete verification** — run the provider adapter
3. **Sign petition** — consume the verified transaction + create signature
4. **Return result** — civic sign ID + authoritative count

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/civic/capabilities` | Provider + assurance capabilities |
| POST | `/api/civic/verification/start` | Allocate verification transaction |
| POST | `/api/civic/verification/complete` | Run provider verification |
| POST | `/api/civic/sign` | Create signature bound to transaction |
| GET | `/api/civic/signatures/ledger` | Public anonymized signatures |
| GET | `/api/civic/signatures/:civicId` | Public signature lookup |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

## Specification

See [CIVIC_SIGNATURE_PROTOCOL.md](./CIVIC_SIGNATURE_PROTOCOL.md) for the protocol specification.

## Privacy & Security

- [Privacy Policy](./PRIVACY.md)
- [Security Policy](./SECURITY.md)
- [Threat Model](./THREAT_MODEL.md)

## License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [CAMARA](https://camara.org/) — open telecom API initiative
- [GSMA Open Gateway](https://www.gsma.com/) — telecom API standardization
- [CockroachDB](https://www.cockroachlabs.com/) — cloud-native SQL database
- [Netlify](https://www.netlify.com/) — hosting and serverless functions
- [Storj](https://www.storj.io/) — decentralized object storage

## Disclaimer

This is an independent implementation. It is not endorsed by CAMARA, GSMA, or any telecom operator. Production network verification requires operator onboarding.
