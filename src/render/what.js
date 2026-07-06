import { animatedWords, brandText, escapeAttribute } from "../lib/html.js";

/**
 * Builds the workflow explanation section.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @returns {HTMLElement}
 */
export function whatSection(localizedContent) {
  const section = document.createElement("section");
  section.id = "what";
  section.className = "section what-section landing-section";
  const steps = localizedContent.what.steps
    .map((step, index) => `
      <li class="workflow-step" data-step-index="${index}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <h3>${brandText(step.title.replace(/^\d+\.\s*/, ""))}</h3>
        <p>${brandText(step.body)}</p>
      </li>
    `)
    .join("");
  const firstWorkflow = localizedContent.what.workflows[0];
  section.innerHTML = `
    <div class="section-card what-card" data-snap-card data-animation-key="what">
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.what.label)}</p>
        <h2 class="section-title what-dynamic-title" aria-live="polite">${animatedWords(localizedContent.what.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.what.body)}</p>
      </div>
      <div class="workflow-showcase">
        <ol class="workflow-list workflow-list-compact">${steps}</ol>
        <div class="what-workflow" aria-label="${escapeAttribute(localizedContent.what.label)} workflow">
          <article class="workflow-editor workflow-input-editor">
            <div class="editor-title-row">
              <h3>${localizedContent.what.inputTitle}</h3>
              <span class="workflow-badge">${firstWorkflow.badge}</span>
            </div>
            <pre><code class="typing-code" data-code="${escapeAttribute(firstWorkflow.inputCode)}"></code></pre>
          </article>
          <div class="workflow-core" aria-label="${escapeAttribute(localizedContent.what.centerLabel)}">
            <span class="workflow-line workflow-line-left"></span>
            <img class="workflow-logo" src="./assets/logo.svg" alt="T00L" width="104" height="104" />
            <span class="workflow-line workflow-line-right"></span>
          </div>
          <article class="workflow-editor workflow-output-editor">
            <div class="editor-title-row">
              <h3>${localizedContent.what.outputTitle}</h3>
              <span class="workflow-badge workflow-output-badge">${firstWorkflow.badge}</span>
            </div>
            <pre><code class="typing-code" data-code="${escapeAttribute(firstWorkflow.outputCode)}"></code></pre>
          </article>
        </div>
      </div>
    </div>
  `;
  return section;
}
