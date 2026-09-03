import React, { useState, useRef } from "react";
import { wildlifeApi } from "../services/api";
import toast from "react-hot-toast";
import { uploadToStorj, audioBlobMeta } from "../lib/storj";
import { recordVoiceNote } from "../services/voiceRecordService";
import { MapPin, Camera, Mic, Upload } from "lucide-react";

export const NewSightingPage: React.FC = () => {
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleRecord = async () => {
    const rec = await recordVoiceNote(60);
    if (rec) {
      setAudioBlob(rec.blob);
      toast.success(`Recorded ${Math.round(rec.durationMs / 1000)}s`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place.trim() || !time) {
      toast.error("Place name and time are required.");
      return;
    }
    if (!confirmRef.current?.checked) {
      toast.error("Please confirm the integrity statement.");
      return;
    }
    setSubmitting(true);
    try {
      // upload photo if present
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const contentType = photoFile.type || 'image/jpeg';
        const photoBlob = new Blob([photoFile], { type: contentType });
        photoUrl = await uploadToStorj("image", photoBlob, ext, contentType);
      }

      // upload audio if present
      let audioUrl: string | null = null;
      if (audioBlob) {
        const { ext, contentType } = audioBlobMeta(audioBlob);
        audioUrl = await uploadToStorj("voice", audioBlob, ext, contentType);
      }

      // get GPS location
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );

      // GPS is best-effort; sighting integrity relies on the citizen's confirmation.
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // proceed without GPS
      }

      await wildlifeApi.reportSighting({
        placeName: place,
        sightingTime: new Date(time).toISOString(),
        imageUrl: photoUrl ?? undefined,
        audioUrl: audioUrl ?? undefined,
        lat,
        lng,
        // Idempotency key: repeated submissions of the same report never duplicate.
        idempotencyKey: `sighting-${place}-${time}-${Date.now()}`,
      });

      toast.success("Sighting reported!");
      // reset form
      setPlace("");
      setTime("");
      setPhotoFile(null);
      setAudioBlob(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.error ?? e?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Report Animal Sighting</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold mb-1">Place Name</label>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. O'Valley, Seaforth Estate, near Church"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Sighting Time</label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Camera size={18} className="text-slate-600" />
            <span className="text-sm font-medium">Add Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {photoFile && <span className="text-xs">{photoFile.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRecord}
            disabled={!!audioBlob}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition ${
              audioBlob
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500"
            }`}
          >
            <Mic size={16} />
            {audioBlob ? "Recorded" : "Record Voice (optional)"}
          </button>
          {audioBlob && (
            <span className="text-sm text-emerald-600">Audio ready</span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <input type="checkbox" ref={confirmRef} className="mt-1" />
          <label className="text-sm">
            I confirm this sighting is genuine and accurate under civic integrity guidelines.
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Sighting"}
        </button>
      </form>
    </div>
  );
};
