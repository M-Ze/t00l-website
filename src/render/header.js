import { brandText } from "../lib/html.js";
import { siteConfig } from "../site-config.js";
import { infoIcon } from "./icons.js";

/**
 * Builds the sticky site header for the active language and theme.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @param {{ language: "de" | "en", theme: "light" | "dark" }} state Current visual state.
 * @returns {HTMLElement}
 */
export function header(localizedContent, state) {
  const element = document.createElement("header");
  element.className = "site-header";
  const themeLabel = state.theme === "dark"
    ? localizedContent.nav.themeLight
    : localizedContent.nav.themeDark;
  const themeIcon = state.theme === "dark" ? "&#9728;" : "&#9790;";
  element.innerHTML = `
    <a class="brand" href="#top" aria-label="T00L home">
      <img src="./assets/logo.svg" alt="" width="40" height="40" />
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="#what">${brandText(localizedContent.nav.what)}</a>
      <a href="#volumina">${localizedContent.nav.volumina}</a>
      <a href="#modules">${localizedContent.nav.modules}</a>
      <a class="info-link" href="#footer" aria-label="${localizedContent.nav.footerInfo}">
        ${infoIcon()}
      </a>
    </nav>
    <div class="header-actions">
      <button class="theme-toggle" type="button" aria-label="${themeLabel}" aria-pressed="${state.theme === "dark"}">
        <span class="theme-icon" aria-hidden="true">${themeIcon}</span>
      </button>
      <button class="language-toggle" type="button" aria-label="${localizedContent.nav.language}">
        ${state.language === "de" ? "EN" : "DE"}
      </button>
      <a class="app-link compact" href="${siteConfig.appUrl}" target="_blank" rel="noopener noreferrer">
        ${localizedContent.nav.app}
      </a>
    </div>
  `;
  return element;
}
