import { qs, qsa } from "../lib/dom.js";
import { hasHorizontalAnimationSpace } from "../lib/animation-layout.js";
import { gsap } from "../services/gsap.js";
import { showReducedMotionHeroTitle } from "./hero.js";
import { setSectionHeadingVisible } from "./section-heading.js";
import { resetWorkflowVisuals } from "./workflow.js";

/**
 * Applies the static animation state for users who prefer reduced motion.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @param {"desktop-horizontal" | "desktop-vertical" | "smartphone-vertical"} animationLayout Active layout branch.
 * @returns {void}
 */
export function showReducedMotionState(localizedContent, animationLayout) {
  showReducedMotionHeroTitle();
  qsa("[data-snap-card]").forEach((card) => setSectionHeadingVisible(card));

  const firstWorkflow = localizedContent.what.workflows[0];
  resetWorkflowVisuals(firstWorkflow);
  const horizontalLayout = hasHorizontalAnimationSpace(animationLayout);
  const workflow = qs(".what-workflow");
  const workflowInput = qs(".workflow-input-editor", workflow || document);
  const workflowOutput = qs(".workflow-output-editor", workflow || document);
  const workflowCore = qs(".workflow-core", workflow || document);
  const inputCode = qs(".workflow-input-editor .typing-code");
  const outputCode = qs(".workflow-output-editor .typing-code");
  if (inputCode) inputCode.textContent = firstWorkflow.adjustedInputCode || firstWorkflow.inputCode;
  if (outputCode) outputCode.textContent = firstWorkflow.outputCode;
  gsap.set([workflowInput, workflowOutput, workflowCore].filter(Boolean), { autoAlpha: 1, y: 0, scale: 1 });
  gsap.set(".workflow-logo", { autoAlpha: 1, scale: 1, rotation: 0 });
  gsap.set(".workflow-line", { scaleX: horizontalLayout ? 1 : 0, transformOrigin: "50% 50%" });
  if (!horizontalLayout) {
    gsap.set([workflowInput, workflowCore].filter(Boolean), { autoAlpha: 0 });
  }

  const demoContent = localizedContent.demo;
  const demoPanels = [qs(".code-panel"), qs(".profile-panel"), qs(".result-panel")].filter(Boolean);
  const demoInput = qs(".demo-input-code");
  const demoOutput = qs(".demo-output-code");
  if (demoInput) demoInput.textContent = demoContent.inputCode;
  if (demoOutput) demoOutput.textContent = demoContent.outputCode;
  gsap.set(demoPanels, { autoAlpha: 1, y: 0, scale: 1 });
  if (!horizontalLayout) {
    gsap.set(demoPanels.slice(0, 2), { autoAlpha: 0 });
  }
  gsap.set(".profile-outline", { strokeDasharray: 0, strokeDashoffset: 0 });
  gsap.set(".profile-fill-mask", { attr: { y: 145.8, height: 146.2 } });
  gsap.set(".module-spark span", { autoAlpha: 0.42, scale: 1, rotation: 0 });
  gsap.set(".module-card", { autoAlpha: 1, y: 0, scale: 1, rotateX: 0 });
  qsa(".module-card").forEach((card) => card.classList.remove("is-highlighted"));
}
