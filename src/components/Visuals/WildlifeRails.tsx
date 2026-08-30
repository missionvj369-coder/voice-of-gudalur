import React from 'react';

/**
 * WildlifeRails — the emotional heart of Voice of Gudalur.
 *
 * Fixed side rails (non-text areas, left & right) showing REAL photography of
 * three lives sharing one landscape, stacked top to bottom:
 *   · Elephant  — Mudumalai Tiger Reserve, Gudalur's own forest (Wikimedia Commons, CC)
 *   · Human     — the Nilgiri hills: tea estates & scattered villages, our home
 *   · Tiger     — a wild Bengal tigress walking her territory
 * Each photo is softly vignetted into the blood-dark theme, drifts gently
 * within its own band (never crossing into another's territory), and a soft
 * firefly spark travels down each rail — calm coexistence, not conflict.
 * Photos load lazily; if the network fails the CSS gradient band remains.
 */
const RAIL_IMAGES = {
  elephant: 'https://commons.wikimedia.org/wiki/Special:FilePath/Asian%20elephant%20from%20Mudumalai%20tiger%20Reserve.jpg?width=640',
  human: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nilgiri%20hills%20in%20western%20ghats.jpg?width=640',
  tiger: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bengal%20tiger%20(Panthera%20tigris%20tigris)%20female%203%20crop.jpg?width=640',
};

/** Photo with a graceful fallback: if the network image fails, the CSS band gradient remains. */
const RailPhoto: React.FC<{ src: string }> = ({ src }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="wl-photo"
    />
  );
};

export const WildlifeRails: React.FC = () => (
  <div className="wildlife-rails" aria-hidden="true">
    <div className="rail rail-left">
      <div className="wl-figure wl-elephant"><RailPhoto src={RAIL_IMAGES.elephant} /></div>
      <div className="wl-figure wl-human"><RailPhoto src={RAIL_IMAGES.human} /></div>
      <div className="wl-figure wl-tiger"><RailPhoto src={RAIL_IMAGES.tiger} /></div>
      <div className="wl-spark" />
    </div>
    <div className="rail rail-right">
      <div className="wl-figure wl-elephant"><RailPhoto src={RAIL_IMAGES.elephant} /></div>
      <div className="wl-figure wl-human"><RailPhoto src={RAIL_IMAGES.human} /></div>
      <div className="wl-figure wl-tiger"><RailPhoto src={RAIL_IMAGES.tiger} /></div>
      <div className="wl-spark" />
    </div>
  </div>
);

export default WildlifeRails;