/**
 * Open Civic Signature Protocol — provider registry.
 *
 * The signature engine never imports a concrete provider. It asks the registry
 * for a MobileIdentityVerifier by name. Adding a new provider = register it
 * here (and its adapter implements the interface in types.ts).
 */
import {
  AssuranceLevel,
  VerificationCapabilities,
  MobileIdentityVerifier,
  ProviderDescriptor,
} from './types';
import { SelfAssertedVerifier } from './selfAsserted';
import { CamaraNumberVerification } from './providers/camara';

const REGISTRY: Record<string, ProviderDescriptor> = {
  'self-asserted': { name: 'self-asserted', verifier: new SelfAssertedVerifier() },
  camara: { name: 'camara', verifier: new CamaraNumberVerification() },
};

/** Resolve a provider by name. Throws when unknown. */
export function getVerifier(name: string): MobileIdentityVerifier {
  const d = REGISTRY[name];
  if (!d) throw new Error(`Unknown identity provider: ${name}`);
  return d.verifier;
}

/** All registered (or explicitly whitelisted) providers with capabilities. */
export function listCapabilities(): Array<VerificationCapabilities> {
  return Object.values(REGISTRY).map((d) => d.verifier.getCapabilities());
}

/** Resolve the best provider for a requested assurance level, in strict order.
 *  Returns the first provider whose maxAssurance >= requested. */
export function resolveProviderForAssurance(
  requested: AssuranceLevel,
  order: string[] = ['camara', 'self-asserted'],
): ProviderDescriptor | null {
  for (const name of order) {
    const d = REGISTRY[name];
    if (!d) continue;
    if (d.verifier.getCapabilities().maxAssurance >= requested) return d;
  }
  return null;
}

/** Test helper: register an in-memory fake (replace by name). */
export function _registerForTesting(name: string, verifier: MobileIdentityVerifier): void {
  (REGISTRY as Record<string, ProviderDescriptor>)[name] = { name: name as any, verifier };
}

export { AssuranceLevel };
export type { VerificationCapabilities, MobileIdentityVerifier, ProviderDescriptor };