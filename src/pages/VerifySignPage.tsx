import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { verifySign } from "../lib/signService";

export const VerifySignPage: React.FC = () => {
  const [params] = useSearchParams();
  const hash = params.get("id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hash) {
        if (!cancelled) setLoading(false);
        return;
      }
      const res = await verifySign(hash);
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900 mb-4">Verify a Signature</h1>

      {loading && <p className="text-sm text-slate-500">Verifying…</p>}

      {!loading && !hash && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-sm text-slate-600">
          Open a verification link (e.g. <code className="text-slate-800">/verify-sign?id=HASH</code>) to
          confirm a petition signature. Only masked details are shown publicly.
        </div>
      )}

      {!loading && data?.valid && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl">✓</span>
            <div>
              <p className="font-black text-emerald-800">GENUINE — Verified Signature</p>
              <p className="text-[11px] text-emerald-600">This signature is recorded on the public docket ledger.</p>
            </div>
          </div>
          <dl className="text-sm space-y-2 text-slate-700">
            <div className="flex justify-between border-b border-emerald-100 pb-1">
              <dt className="text-slate-400">Signed by</dt>
              <dd className="font-bold">{data.full_name}</dd>
            </div>
            <div className="flex justify-between border-b border-emerald-100 pb-1">
              <dt className="text-slate-400">Place</dt>
              <dd className="font-bold">{data.village || "—"}</dd>
            </div>
            <div className="flex justify-between border-b border-emerald-100 pb-1">
              <dt className="text-slate-400">Phone</dt>
              <dd className="font-bold tracking-widest">••••{data.phone_last4}</dd>
            </div>
            <div className="flex justify-between border-b border-emerald-100 pb-1">
              <dt className="text-slate-400">Aadhaar</dt>
              <dd className="font-bold tracking-widest">••••{data.aadhaar_last4}</dd>
            </div>
            <div className="flex justify-between border-b border-emerald-100 pb-1">
              <dt className="text-slate-400">Batch</dt>
              <dd className="font-bold">#{data.batch_no}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Timestamp (UTC)</dt>
              <dd className="font-bold">{new Date(data.created_at).toISOString()}</dd>
            </div>
          </dl>
        </div>
      )}

      {!loading && data && !data.valid && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          ❌ No verified signature found for this token.
        </div>
      )}
    </div>
  );
};