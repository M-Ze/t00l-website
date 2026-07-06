import { animatedWords, brandText, escapeAttribute } from "../lib/html.js";
import { siteConfig } from "../site-config.js";

/**
 * Builds the hero section.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @returns {HTMLElement}
 */
export function hero(localizedContent) {
  const element = document.createElement("main");
  element.id = "top";
  element.className = "hero landing-section";
  element.innerHTML = `
    <div class="section-card hero-card" data-snap-card data-animation-key="hero">
      <section class="hero-copy" aria-labelledby="hero-title">
        <p class="eyebrow">${brandText(localizedContent.hero.eyebrow)}</p>
        <h1 id="hero-title" class="hero-title hero-title-text" aria-label="${escapeAttribute(`${siteConfig.appName}: ${localizedContent.hero.title}`)}">
          <span class="hero-title-layer is-active" data-hero-title="short" aria-hidden="true">
            ${animatedWords(siteConfig.appName, "hero-title-word")}
          </span>
          <span class="hero-title-layer" data-hero-title="long" aria-hidden="true">
            ${animatedWords(localizedContent.hero.title, "hero-title-word")}
          </span>
        </h1>
        <p class="lead">${brandText(localizedContent.hero.description)}</p>
        <div class="hero-actions">
          <a class="app-link primary" href="${siteConfig.appUrl}" target="_blank" rel="noopener noreferrer">
            ${localizedContent.hero.primary}
          </a>
          <a class="secondary-link" href="#what">${brandText(localizedContent.hero.secondary)}</a>
        </div>
        <p class="warmup-status" aria-live="polite"></p>
      </section>
    </div>
  `;
  return element;
}
