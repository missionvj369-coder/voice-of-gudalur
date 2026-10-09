import React, { useCallback, useEffect, useState } from "react";
import { authApi, officialsApi } from "../services/api";
import toast from "react-hot-toast";

interface OfficialRow {
  sign_hash: string;
  gdr_id: string;
  full_name: string;
  village: string;
  phone_last4: string;
  aadhaar_last4: string;
  batch_no: number;
  created_at: string;
}

export const OfficialsPortalPage: React.FC = () => {
  const [mode, setMode] = useState<"request" | "otp" | "view">("request");
  const [officialEmail, setOfficialEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<OfficialRow[]>([]);
  const [accessNote, setAccessNote] = useState("");

  const requestAccess = useCallback(async () => {
    if (!officialEmail.includes("@") || !fullName.trim()) {
      toast.error("Official email and name are required");
      return;
    }
    setBusy(true);
    try {
      await authApi.officialRequest(officialEmail, fullName, phone);
      toast.success("Request submitted to the master admin for approval.");
      setMode("otp");
    } catch (e: any) {
      toast.error(e?.message ?? "Request failed");
    } finally {
      setBusy(false);
    }
  }, [officialEmail, fullName, department, designation, phone]);

  const sendOtp = useCallback(async () => {
    setBusy(true);
    try {
      const res = await authApi.officialOtp(officialEmail);
      toast.success("OTP sent to your official email");
      // Dev/test provider returns the code directly; surface it so the flow is testable.
      if (res.otp?.code) {
        setOtp(res.otp.code);
        toast.success(`Dev OTP: ${res.otp.code}`, { icon: "🚨" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "OTP send failed");
    } finally {
      setBusy(false);
    }
  }, [officialEmail]);

  const verifyOtp = useCallback(async () => {
    if (otp.trim().length < 6) return toast.error("Enter the 6-digit OTP");
    setBusy(true);
    try {
      await authApi.officialVerify(officialEmail, otp.trim());
      toast.success("Logged in as official");
      loadView();
    } catch (e: any) {
      toast.error(e?.message ?? "OTP verification failed");
    } finally {
      setBusy(false);
    }
  }, [officialEmail, otp]);

  const loadView = useCallback(async () => {
    setBusy(true);
    try {
      const res = await officialsApi.signs();
      setRows((res.signs ?? []) as unknown as OfficialRow[]);
      setMode("view");
    } catch (e: any) {
      if (String(e?.message ?? "").includes("Forbidden") || e?.status === 403) {
        setAccessNote("Your email is not yet approved by the master admin.");
        setMode("otp");
      } else {
        toast.error(e?.message ?? "Failed to load");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
        // No auth listener from a third-party — the session is cookie-based. If we already
    // hold an official session, load the view directly.
    (async () => {
      try {
        const { user } = await authApi.me();
        if (user?.kind === "official") {
          if (user.email) setOfficialEmail(user.email);
          loadView();
        }
      } catch {
        /* not signed in — stay on the request screen */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockCopy = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast("Copy/download is disabled — this is a read-only audit view.");
  }, []);

  return (
    <div
      className="max-w-5xl mx-auto px-4 py-8 space-y-6"
      onCopy={blockCopy}
      onContextMenu={(e) => {
        e.preventDefault();
        toast("Right-click / download is disabled in the audit view.");
      }}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Officials Audit Portal</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Government officials verify the verified petition signatures collected for the
          Mudhalvan Mugavari grievance — read-only, no editing, downloading or copying.
        </p>
      </div>

      {mode === "request" && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <p className="text-sm font-bold text-slate-700">Request official audit access</p>
          <p className="text-[11px] text-slate-500">
            Your request is reviewed by the <strong>master admin</strong>. Once approved, you log
            in with the approved official email.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value.trim())} placeholder="Official email (gov.in / nic.in)" className="px-4 py-3 rounded-xl border border-slate-300 text-sm" />
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="px-4 py-3 rounded-xl border border-slate-300 text-sm" />
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department (e.g. Forest Dept)" className="px-4 py-3 rounded-xl border border-slate-300 text-sm" />
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Designation" className="px-4 py-3 rounded-xl border border-slate-300 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="Official phone" className="px-4 py-3 rounded-xl border border-slate-300 text-sm" />
          </div>
          <button onClick={requestAccess} disabled={busy} className="w-full py-3 rounded-xl bg-[#2E7D32] hover:bg-[#388E3C] text-white font-bold text-sm">
            {busy ? "Submitting…" : "Submit access request"}
          </button>
        </div>
      )}

      {mode === "otp" && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <p className="text-sm font-bold text-slate-700">Login with official email OTP</p>
          <p className="text-[11px] text-slate-500">Email: <strong>{officialEmail}</strong></p>
          {accessNote && <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-3">{accessNote}</p>}
          <div className="space-y-3">
            <button onClick={sendOtp} disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">
              Send OTP to {officialEmail}
            </button>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="6-digit OTP" maxLength={6} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-center tracking-[0.5em]" />
            <button onClick={verifyOtp} disabled={busy} className="w-full py-3 rounded-xl bg-[#2E7D32] text-white font-bold text-sm">
              {busy ? "Verifying…" : "Verify & Enter Portal"}
            </button>
          </div>
        </div>
      )}

      {mode === "view" && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-700">Verified signatures — read only</p>
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">🔒 {rows.length} signs</span>
          </div>
          <div className="overflow-auto max-h-[65vh] rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-400">
                  <th className="px-3 py-2">GDR ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Place</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Aadhaar</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Timestamp UTC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.sign_hash} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{r.gdr_id}</td>
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2">{r.village || "—"}</td>
                    <td className="px-3 py-2">••••{r.phone_last4}</td>
                    <td className="px-3 py-2">••••{r.aadhaar_last4}</td>
                    <td className="px-3 py-2">#{r.batch_no}</td>
                    <td className="px-3 py-2">{new Date(r.created_at).toISOString()}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No verified signatures yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Exactly as signed by GDR-verified citizens. No editing, downloading, or copying is permitted.
          </p>
        </div>
      )}
    </div>
  );
};