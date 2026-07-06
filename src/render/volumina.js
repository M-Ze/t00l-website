import { animatedWords, brandText, escapeAttribute } from "../lib/html.js";

/**
 * Builds the Volumina demonstration section.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @returns {HTMLElement}
 */
export function voluminaDemo(localizedContent) {
  const section = document.createElement("section");
  section.id = "volumina";
  section.className = "section demo-section landing-section";
  const inputCode = localizedContent.demo.inputCode;
  const outputCode = localizedContent.demo.outputCode;
  section.innerHTML = `
    <div class="section-card demo-card" data-snap-card data-animation-key="volumina">
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.demo.label)}</p>
        <h2 class="section-title">${animatedWords(localizedContent.demo.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.demo.body)}</p>
      </div>
      <div class="demo-grid">
        <article class="code-panel">
          <h3>${localizedContent.demo.inputTitle}</h3>
          <pre><code class="demo-input-code" data-code="${escapeAttribute(inputCode)}"></code></pre>
        </article>
        <article class="profile-panel">
          <h3>${localizedContent.demo.previewTitle}</h3>
          ${voluminaProfileSvg()}
        </article>
        <article class="result-panel">
          <h3>${localizedContent.demo.outputTitle}</h3>
          <pre><code class="demo-output-code" data-code="${escapeAttribute(outputCode)}"></code></pre>
        </article>
      </div>
    </div>
  `;
  return section;
}

function voluminaProfileSvg() {
  const profilePath = "M 76.8 145.8 C 77 96 91 55 103.5 33 C 108.8 24 116.2 20 125.6 19.8 L 384.6 19.9 C 395.4 20.2 402.5 26 407 37.3 C 423.1 72.5 431.6 106.8 431.6 145.8 C 431.6 184.8 423.1 219.1 407 254.3 C 402.5 265.6 393.8 271.8 382.8 271.8 L 123.8 271.7 C 113.1 271.3 106 265.2 101.4 254.3 C 85.3 219.1 76.8 184.8 76.8 145.8 Z";
  return `
    <svg class="profile-svg" viewBox="50 0 405 292" role="img" aria-label="Animated Volumina vessel profile">
      <defs>
        <clipPath id="profile-half-fill">
          <rect class="profile-fill-mask" x="50" y="145.8" width="405" height="146.2" />
        </clipPath>
      </defs>
      <path class="profile-glow" d="${profilePath}" />
      <path class="profile-fill" clip-path="url(#profile-half-fill)" d="${profilePath}" />
      <path class="profile-outline" d="${profilePath}" />
    </svg>
  `;
}
