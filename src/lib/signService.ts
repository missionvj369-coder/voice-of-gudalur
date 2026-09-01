// Voice of Gudalur — Petition Sign Service
// Records a verified signature (GDR ID + Aadhaar details + UTC timestamp)
// into the public `petition_signs` table via the RPC `record_petition_sign`.
// One sign per GDR ID. Returns a verify-link the signer/anyone can open.

import { supabase } from "./supabase";
import { computeUserAgentHash, generateDocketHash } from "./security";
import { getStoredCoords } from "../components/LocationGate";

export interface SignInput {
  gdrId: string;
  fullName: string;
  village: string;
  phone: string;
  aadhaarLast4: string;
  aadhaarRef?: string;
}

export interface SignResult {
  ok: boolean;
  signHash?: string;
  batchNo?: number;
  error?: string;
  alreadySigned?: boolean;
  verifyUrl?: string;
}

export async function recordPetitionSign(input: SignInput): Promise<SignResult> {
  try {
    const coords = getStoredCoords();
    const uaHash = await computeUserAgentHash();
    const signHash = generateDocketHash();

    const { data, error } = await supabase.rpc("record_petition_sign", {
      p_sign_hash: signHash,
      p_gdr_id: input.gdrId,
      p_full_name: input.fullName,
      p_village: input.village || null,
      p_phone: input.phone,
      p_aadhaar_last4: input.aadhaarLast4,
      p_aadhaar_ref: input.aadhaarRef || null,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_user_agent_hash: uaHash,
    });

    if (error || !data?.ok) {
      if (data?.error === "already_signed") {
        return { ok: false, alreadySigned: true, error: "You have already signed this petition." };
      }
      return { ok: false, error: error?.message ?? data?.error ?? "Registration failed. Run the capstone schema in Supabase." };
    }

    const verifyUrl = `${window.location.origin}/verify-sign?id=${data.signHash}`;
    return { ok: true, signHash: data.signHash, batchNo: data.batchNo, verifyUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unexpected error while signing." };
  }
}

/** Public verify — masked details, no copy of PII stolen (only last-4 shown). */
export async function verifySign(signHash: string): Promise<any> {
  const { data, error } = await supabase.rpc("verify_petition_sign", { p_sign_hash: signHash });
  if (error) return { valid: false, error: error.message };
  return data;
}

/** Approved officials only — full audit view via SECURITY DEFINER RPC. */
export async function officialSignsView(): Promise<any[]> {
  const { data, error } = await supabase.rpc("official_signs_view");
  if (error) throw new Error(error.message);
  return data || [];
}