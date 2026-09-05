/** Decorative layers are separate from labels so text is never blurred. */
export function GooeyLayer() {
  return <span className="site-liquid" aria-hidden="true"><i /><i /></span>;
}

export function GooeyFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <filter id="atelier-site-gooey" x="-30%" y="-60%" width="160%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
        </filter>
      </defs>
    </svg>
  );
}
