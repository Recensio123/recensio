/*
 * Mobile rules for the customer sites.
 *
 * The templates are laid out with inline styles written for a desktop canvas,
 * which left every published site broken on a phone — overlapping navigation,
 * headlines wider than the screen, three-column grids squeezed into 375px.
 * That is the majority of "frisör nära mig" traffic, and the version Google
 * indexes first.
 *
 * Rather than rewrite five layouts by hand, the desktop design stays as it is
 * and these rules take over below the breakpoints. Scoped to .kr-site so the
 * dashboard around the preview is untouched.
 */
export function SiteStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
.kr-site img { max-width: 100%; height: auto; }
/* clip, not hidden: both stop a wide section from scrolling the page
   sideways, but 'hidden' makes the root a scroll container, and that quietly
   disables every position:sticky inside it — the contact strip among them.
   The 'hidden' line stays first as the fallback for older browsers. */
.kr-site { overflow-x: hidden; }
.kr-site { overflow-x: clip; }

/* The hide-away menu. Driven by a checkbox rather than JavaScript so it works
   the same inside the editor, where a click on the page is already claimed by
   the editing layer, as it does on the published site. */
.kr-site .kr-burger { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
.kr-site .kr-menu-panel {
  display: none;
  position: fixed; inset: 0; z-index: 60;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 22px; padding: 40px 8%;
  backdrop-filter: blur(6px);
}
.kr-site .kr-burger:checked ~ .kr-menu-panel,
.kr-site .kr-burger:checked ~ * .kr-menu-panel { display: flex; }
.kr-site .kr-burger-btn { user-select: none; }
.kr-site .kr-burger:focus-visible ~ * .kr-burger-btn { outline: 2px solid currentColor; outline-offset: 4px; }

@media (max-width: 900px) {
  .kr-site [data-grid="services"] { grid-template-columns: repeat(2, 1fr) !important; }
}

@media (max-width: 768px) {
  /* Sections: the 8–10% side padding becomes unusable at phone widths */
  .kr-site section,
  .kr-site footer { padding-left: 20px !important; padding-right: 20px !important; }
  .kr-site section { padding-top: 48px !important; padding-bottom: 48px !important; }

  /* Navigation stacks instead of overlapping the logo */
  .kr-site nav { padding: 12px 16px !important; height: auto !important; }
  .kr-site nav > div {
    flex-wrap: wrap !important;
    height: auto !important;
    gap: 10px 18px !important;
    justify-content: center !important;
  }
  .kr-site nav a[style*="absolute"] {
    position: static !important;
    transform: none !important;
    display: block !important;
    margin: 4px auto 0 !important;
  }

  /* Type scales down — 60px headlines do not fit 375px */
  .kr-site h1 { font-size: 32px !important; line-height: 1.2 !important; letter-spacing: -0.5px !important; }
  .kr-site h2 { font-size: 24px !important; line-height: 1.25 !important; letter-spacing: -0.3px !important; }
  .kr-site h3 { font-size: 17px !important; }
  .kr-site p  { font-size: 15px !important; }
  .kr-site [data-kicker] { font-size: 11px !important; letter-spacing: 2px !important; }

  /* Every multi-column grid becomes one column, except the gallery which
     still reads well two-up */
  .kr-site [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  .kr-site [data-grid="gallery"] { grid-template-columns: repeat(2, 1fr) !important; }
  .kr-site [data-grid="stats"] { grid-template-columns: repeat(2, 1fr) !important; display: grid !important; gap: 20px !important; }

  /* Side-by-side split sections stack */
  .kr-site [data-split] { display: block !important; }
  .kr-site [data-split] > * { width: 100% !important; }

  /* Flex rows that were never meant to wrap */
  .kr-site [data-row] { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }

  /* Comfortable tap targets — Google counts these in mobile usability */
  .kr-site a[style*="padding"] { display: inline-block; }
  .kr-site [data-cta] { display: block !important; text-align: center !important; padding: 15px 24px !important; }
}

@media (max-width: 420px) {
  .kr-site h1 { font-size: 27px !important; }
  .kr-site [data-grid="gallery"] { grid-template-columns: 1fr !important; }
}
    ` }} />
  )
}
