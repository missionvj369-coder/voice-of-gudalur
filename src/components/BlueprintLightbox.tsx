import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { ACTIVISM } from '../data/vision2035';

/**
 * BlueprintLightbox — the zoomable full-screen view of the Vision 2035
 * blueprint.
 *
 * WHY a lightbox at all: the blueprint is a 5-pillar poster. On a 360px
 * phone the pillar titles are ~7px tall — technically readable, practically
 * not. The lightbox is the answer: tap to open, zoom (buttons, ⌘/Ctrl+wheel,
 * or the platform pinch gesture), drag to pan, and every word is readable
 * without leaving the page.
 *
 * Implementation notes:
 *   • zoom + pan are plain transform state — no gesture library, no deps.
 *   • pointer events give mouse-drag, touch-drag and pen-drag in one path.
 *   • Escape closes and the page behind cannot scroll under a full-screen
 *     dialog on a phone (otherwise the page slides away behind it).
 *   • reduced-motion users are unaffected: the only transition is a 160ms
 *     transform, which index.css already neutralises for them.
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const STEP = 0.5;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Rendered inside the dialog; the caller owns the blueprint markup. */
  children: React.ReactNode;
  title: string;
}

export const BlueprintLightbox: React.FC<Props> = ({ open, onClose, children, title }) => {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const setZoomClamped = useCallback((next: number) => {
    setZoom((prev) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      // At 1x the pan offset is meaningless — drop it so the blueprint always
      // re-centres cleanly when the visitor zooms back out.
      if (z === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return z;
    });
  }, []);

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  // A fresh open always starts at 1x — reopening a half-panned blueprint
  // reads as a bug, not a feature.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);


  // Escape closes; the page behind must not scroll under a full-screen dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  // ⌘/Ctrl + wheel zooms (the desktop equivalent of pinch). A bare wheel is
  // deliberately NOT hijacked — it must still scroll the page.
  useEffect(() => {
    if (!open) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomClamped(zoom + (e.deltaY < 0 ? STEP : -STEP));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [open, zoom, setZoomClamped]);

  if (!open || typeof document === 'undefined') return null;


  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Tapping the backdrop closes — the close button is what keyboard and
          screen-reader users land on (it takes focus on open). */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-zoom-out border-0"
        style={{ background: 'rgba(5,5,7,0.94)' }}
      />

      <div
        className="relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: ACTIVISM.line, background: ACTIVISM.ink }}
      >
        <p className="font-black text-xs uppercase tracking-widest" style={{ color: ACTIVISM.vision }}>
          {title}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomClamped(zoom + STEP)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="rounded-lg border p-2 disabled:opacity-40"
            style={{ borderColor: ACTIVISM.line, color: ACTIVISM.text }}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoomClamped(zoom - STEP)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="rounded-lg border p-2 disabled:opacity-40"
            style={{ borderColor: ACTIVISM.line, color: ACTIVISM.text }}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset zoom"
            className="rounded-lg border p-2"
            style={{ borderColor: ACTIVISM.line, color: ACTIVISM.text }}
          >
            {zoom > MIN_ZOOM ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close blueprint"
            className="rounded-lg p-2"
            style={{ background: ACTIVISM.urgent, color: '#fff' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Blueprint surface — drag to pan once zoomed in. touchAction keeps the
          page scrollable with one finger while still allowing our drag. */}
      <div
        className="relative z-10 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > MIN_ZOOM ? 'grab' : 'zoom-in', touchAction: 'pan-y' }}
      >
        <div
          className="flex h-full w-full items-center justify-center p-3 sm:p-6"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 160ms ease-out',
          }}
        >
          <div className="w-full max-w-[1400px]">{children}</div>
        </div>
      </div>

      <p
        className="relative z-10 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest"
        style={{ color: ACTIVISM.muted, background: ACTIVISM.ink }}
      >
        {Math.round(zoom * 100)}% · drag to pan · ESC to close
      </p>
    </div>,
    document.body,
  );
};

export default BlueprintLightbox;
