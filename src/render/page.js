import { backgroundOrbits } from "./background.js";
import { footer } from "./footer.js";
import { header } from "./header.js";
import { hero } from "./hero.js";
import { modules } from "./modules.js";
import { scrollControls } from "./scroll-controls.js";
import { voluminaDemo } from "./volumina.js";
import { whatSection } from "./what.js";

/**
 * Builds the complete document fragment for the current localized content.
 * @param {{
 *   localizedContent: typeof import("../content.js").content.de,
 *   language: "de" | "en",
 *   theme: "light" | "dark",
 * }} options Current render options.
 * @returns {DocumentFragment}
 */
export function buildPage(options) {
  const fragment = document.createDocumentFragment();
  fragment.append(
    backgroundOrbits(),
    header(options.localizedContent, options),
    hero(options.localizedContent),
    whatSection(options.localizedContent),
    voluminaDemo(options.localizedContent),
    modules(options.localizedContent),
    footer(options.localizedContent),
    scrollControls(),
  );
  return fragment;
}
