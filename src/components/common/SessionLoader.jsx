/**
 * SessionLoader — Branded RIMT University institutional session loader.
 *
 * This is a SERVER component (no "use client", no hooks) so it renders in the
 * initial HTML payload and animates via pure CSS before React hydrates.
 *
 * All animations use only `transform` and `opacity` for GPU-composited performance.
 * A `prefers-reduced-motion` block disables all animation.
 *
 * The dot and spinner are pure CSS shapes — no Material Symbols dependency
 * (that font uses font-display:block and would flash blank).
 *
 * @param {Object} props
 * @param {string} [props.message='Initializing Session...'] — Status text
 */
export const MIN_LOADER_MS = 1900;
export const FADE_MS = 300;

export default function SessionLoader({
  message = 'Initializing Session...',
  leaving = false,
}) {
  return (
    <div
      className={`rimt-loader${leaving ? ' rimt-loader--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Ambient Radial Glow */}
      <div className="rimt-loader__ambient-glow-1" aria-hidden="true" />
      <div className="rimt-loader__ambient-glow-2" aria-hidden="true" />

      {/* Central Logo Stage */}
      <div className="rimt-loader__stage">
        {/* Shockwave Rings */}
        <div className="rimt-loader__shockwave rimt-loader__shockwave-1" aria-hidden="true" />
        <div className="rimt-loader__shockwave rimt-loader__shockwave-2" aria-hidden="true" />

        {/* Outer Logo Card */}
        <div className="rimt-loader__card">
          {/* Top Specular Rim */}
          <div className="rimt-loader__specular-rim" aria-hidden="true" />

          {/* White Sweep Sheen across RIMT University logo */}
          <div className="rimt-loader__sheen-container" aria-hidden="true">
            <div className="rimt-loader__sheen" />
          </div>

          {/* RIMT University Logo Image */}
          <img
            src="/rimt-logo.png"
            alt="RIMT University"
            className="rimt-loader__logo-img"
          />
        </div>
      </div>

      {/* Verification / Initializing Status Indicator */}
      <div className="rimt-loader__status">
        <div className="rimt-loader__spinner-box" aria-hidden="true">
          {/* Outer Maroon Spinner */}
          <span className="rimt-loader__spinner-outer" />
          {/* Inner Gold Accent */}
          <span className="rimt-loader__spinner-inner" />
        </div>
        <span className="rimt-loader__status-text">{message}</span>
      </div>
    </div>
  );
}
