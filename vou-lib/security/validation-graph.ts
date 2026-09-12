/**
 * Circular validation detection.
 * 
 * Prevents:
 * - Self-validation (A validates A)
 * - Mutual validation (A validates B, B validates A)
 * - Short circular patterns (A→B, B→C, C→A)
 * 
 * Also enforces one-witness-per-petition rule.
 */

import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Check if a witness can validate a signature.
 * Returns null if allowed, or a reason string if blocked.
 */
export async function checkValidationEligibility(
  prisma: TxClient,
  petitionId: string,
  signatureId: string,
  witnessIdentityId: string
): Promise<string | null> {
  // 1. Fetch the signature and its owner
  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
    select: { identity_id: true, status: true },
  });

  if (!signature) {
    return "Signature not found";
  }

  // 2. Check self-validation
  if (signature.identity_id === witnessIdentityId) {
    return "Cannot validate your own signature";
  }

  // 3. Check if witness has already validated another signature for this petition
  const existingValidation = await prisma.validation.findUnique({
    where: {
      witness_identity_id_petition_id: {
        witness_identity_id: witnessIdentityId,
        petition_id: petitionId,
      },
    },
    select: { id: true, signature_id: true },
  });

  if (existingValidation) {
    if (existingValidation.signature_id === signatureId) {
      return "Already validated this signature";
    }
    return "Already validated another signature for this petition";
  }

  // 4. Check if the signer has already validated another signature for this petition
  // (prevents someone from being both signer and witness in the same petition)
  const signerAsWitness = await prisma.validation.findUnique({
    where: {
      witness_identity_id_petition_id: {
        witness_identity_id: signature.identity_id,
        petition_id: petitionId,
      },
    },
    select: { id: true },
  });

  if (signerAsWitness) {
    return "Signer has already acted as witness for this petition";
  }

  // 5. Check for mutual validation (A validates B, now B tries to validate A)
  // We check if the signer has validated any signature by the witness
  const mutualCheck = await prisma.validation.findFirst({
    where: {
      witness_identity_id: signature.identity_id,
      petition_id: petitionId,
      signature: {
        identity_id: witnessIdentityId,
      },
    },
    select: { id: true },
  });

  if (mutualCheck) {
    return "Mutual validation detected";
  }

  // 6. Check for short circular patterns (A→B, B→C, C→A)
  const circularReason = await detectCircularPattern(
    prisma,
    petitionId,
    signatureId,
    witnessIdentityId,
    signature.identity_id
  );

  if (circularReason) {
    return circularReason;
  }

  return null; // All checks passed
}

/**
 * Detect short circular validation patterns.
 * Depth-limited DFS to find cycles of length 2-4.
 */
async function detectCircularPattern(
  prisma: TxClient,
  petitionId: string,
  _signatureId: string,
  witnessIdentityId: string,
  signerIdentityId: string
): Promise<string | null> {
  // Check for 3-cycle: witness validated X, X validated Y, Y validated signer
  // This means: witness → X → Y → signer → witness (if we add witness → signer)

  // Get all signatures validated by the witness in this petition
  const witnessValidations = await prisma.validation.findMany({
    where: {
      witness_identity_id: witnessIdentityId,
      petition_id: petitionId,
    },
    select: { signature: { select: { identity_id: true } } },
  });

  for (const wv of witnessValidations) {
    const intermediateIdentityId = wv.signature.identity_id;

    // Check if this intermediate identity validated someone who validated the signer
    const intermediateValidations = await prisma.validation.findMany({
      where: {
        witness_identity_id: intermediateIdentityId,
        petition_id: petitionId,
      },
      select: { signature: { select: { identity_id: true } } },
    });

    for (const iv of intermediateValidations) {
      // Check if this second-level identity validated the signer
      if (iv.signature.identity_id === signerIdentityId) {
        return "Circular validation pattern detected (length 3)";
      }

      // Check length 4 cycles
      const thirdLevelValidations = await prisma.validation.findMany({
        where: {
          witness_identity_id: iv.signature.identity_id,
          petition_id: petitionId,
        },
        select: { signature: { select: { identity_id: true } } },
      });

      for (const tlv of thirdLevelValidations) {
        if (tlv.signature.identity_id === signerIdentityId) {
          return "Circular validation pattern detected (length 4)";
        }
      }
    }
  }

  // Also check reverse: does anyone in signer's chain point back to witness?
  // signer validated X, X validated Y, Y validated witness → cycle
  const signerValidations = await prisma.validation.findMany({
    where: {
      witness_identity_id: signerIdentityId,
      petition_id: petitionId,
    },
    select: { signature: { select: { identity_id: true } } },
  });

  for (const sv of signerValidations) {
    const intermediateId = sv.signature.identity_id;

    // Check if this intermediate validated the witness
    if (intermediateId === witnessIdentityId) {
      // This is the mutual case (already caught above, but defensive)
      return "Mutual validation detected";
    }

    // Check one more level
    const intermediateValidations2 = await prisma.validation.findMany({
      where: {
        witness_identity_id: intermediateId,
        petition_id: petitionId,
      },
      select: { signature: { select: { identity_id: true } } },
    });

    for (const iv2 of intermediateValidations2) {
      if (iv2.signature.identity_id === witnessIdentityId) {
        return "Circular validation pattern detected (reverse, length 3)";
      }
    }
  }

  return null;
}
