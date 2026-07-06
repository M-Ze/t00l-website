import { brandText } from "../lib/html.js";
import { siteConfig } from "../site-config.js";
import { githubIcon, mailIcon } from "./icons.js";

/**
 * Builds the page footer.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @returns {HTMLElement}
 */
export function footer(localizedContent) {
  const element = document.createElement("footer");
  element.id = "footer";
  element.className = "site-footer";
  element.innerHTML = `
    <div>
      <strong class="brand-code">${siteConfig.appName}</strong>
      <p>${brandText(localizedContent.footer.disclaimer)}</p>
    </div>
    <nav aria-label="Footer">
      <a class="footer-icon-link" href="${siteConfig.githubUrl}" target="_blank" rel="noopener noreferrer" aria-label="${localizedContent.footer.github}">
        ${githubIcon()}
      </a>
      <a class="footer-icon-link" href="mailto:${siteConfig.email}" aria-label="${localizedContent.footer.email}">
        ${mailIcon()}
      </a>
    </nav>
    <small>${siteConfig.versionLabel} &middot; ${siteConfig.copyright}</small>
  `;
  return element;
}
