import { animatedWords, brandText } from "../lib/html.js";

/**
 * Builds the upcoming modules section.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @returns {HTMLElement}
 */
export function modules(localizedContent) {
  const section = document.createElement("section");
  section.id = "modules";
  section.className = "section modules-section landing-section";
  const cards = localizedContent.modules.cards
    .map((card) => `<li class="module-card">${brandText(card)}</li>`)
    .join("");
  section.innerHTML = `
    <div class="section-card modules-card" data-snap-card data-animation-key="modules">
      <div class="module-spark" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.modules.label)}</p>
        <h2 class="section-title module-title">${animatedWords(localizedContent.modules.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.modules.body)}</p>
      </div>
      <ul class="module-grid">${cards}</ul>
    </div>
  `;
  return section;
}
