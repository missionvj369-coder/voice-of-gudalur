# CAMARA Production Access

## Reality Check

The CAMARA specification is open. Production network access is not.

This document separates what is available today from what requires external action.

## What Exists Now

| Item | Status | Access |
|------|--------|--------|
| CAMARA specification | ✅ Open standard | [camara.org](https://camara.org/) |
| CAMARA API definitions | ✅ Open-source (Linux Foundation) | GitHub |
| CAMARA sandbox | ✅ Available | Through participating operators |
| GSMA Open Gateway | ✅ Active initiative | [gsma.com](https://www.gsma.com/) |

## What Requires External Action

| Item | Status | Requirement |
|------|--------|-------------|
| Production operator access | ❌ Not assumed | Onboarding with participating operator |
| Production credentials | ❌ Not assumed | Commercial agreement |
| Aggregator partnership | ❌ Not assumed | Business relationship |
| Commercial terms | ❌ Not assumed | Negotiated per deployment |

## Onboarding Steps

To move from sandbox to production:

1. **Identify participating operators** in the target country/region.
2. **Contact the operator** (or an authorized aggregator/channel partner).
3. **Complete the operator's onboarding process** (technical + commercial).
4. **Obtain production OAuth credentials** (client_id, client_secret).
5. **Configure production endpoints** in environment variables.
6. **Switch `CAMARA_MODE` from `sandbox` to `production`**.
7. **Verify end-to-end** with test phone numbers.

## Aggregator Option

Instead of contacting operators individually, you may work with an **aggregator** — a channel partner that provides access to multiple operators through a single integration.

Aggregators for the CAMARA ecosystem include:
- GSMA Open Gateway listed partners
- Technology partners (consult their current status)

**No specific aggregator is endorsed here.** Due diligence is required.

## Legal & Privacy Requirements

Production operator access typically requires:
- A legal entity (organization, not individual).
- Compliance with local telecom regulations.
- Data processing agreements.
- Privacy policy covering the verification use case.
- Consent mechanism for subscribers.

## Current Implementation Status

| Capability | Status |
|------------|--------|
| CAMARA adapter code | ✅ Implemented |
| Sandbox configuration | ✅ Implemented |
| Production configuration | ❌ Not configured (no credentials) |
| Fallback to self-asserted | ✅ Implemented |
| End-to-end flow | ✅ Works with sandbox or fallback |

## Honest Assessment

**The code is production-ready. The provider access is not.**

The adapter, state machine, privacy layer, and fallback behavior are all implemented and tested. Using them in production with a real operator requires:
1. Finding a participating operator or aggregator.
2. Completing their onboarding.
3. Getting credentials.
4. Configuring the application.

Until then, the system operates in **self-asserted mode** — which provides legitimate verification (the submitter confirms control of their number) without network operator involvement.

## No Fabricated Credentials

This implementation **never**:
- Uses fake credentials in production.
- Mocks responses in production code.
- Claims network verification without an operator.
- Pretends sandbox is production.

The `CAMARA_MODE` variable makes the current mode explicit and auditable.
