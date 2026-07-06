export const SMARTPHONE_ANIMATION_QUERY = "(max-width: 560px)";
export const VERTICAL_ANIMATION_QUERY = "(orientation: portrait), (max-width: 980px)";

export const ANIMATION_LAYOUTS = Object.freeze({
  DESKTOP_HORIZONTAL: "desktop-horizontal",
  DESKTOP_VERTICAL: "desktop-vertical",
  SMARTPHONE_VERTICAL: "smartphone-vertical",
});

/**
 * Returns the animation layout branch that matches the current viewport.
 * @returns {"desktop-horizontal" | "desktop-vertical" | "smartphone-vertical"}
 */
export function animationLayoutForViewport() {
  if (window.matchMedia(SMARTPHONE_ANIMATION_QUERY).matches) {
    return ANIMATION_LAYOUTS.SMARTPHONE_VERTICAL;
  }
  if (window.matchMedia(VERTICAL_ANIMATION_QUERY).matches) {
    return ANIMATION_LAYOUTS.DESKTOP_VERTICAL;
  }
  return ANIMATION_LAYOUTS.DESKTOP_HORIZONTAL;
}

/**
 * Returns true when the viewport has enough room for side-by-side animation.
 * @param {string} layout Active animation layout.
 * @returns {boolean}
 */
export function hasHorizontalAnimationSpace(layout) {
  return layout === ANIMATION_LAYOUTS.DESKTOP_HORIZONTAL;
}

/**
 * Returns true when the compact smartphone animation branch is active.
 * @param {string} layout Active animation layout.
 * @returns {boolean}
 */
export function isSmartphoneAnimationLayout(layout) {
  return layout === ANIMATION_LAYOUTS.SMARTPHONE_VERTICAL;
}
