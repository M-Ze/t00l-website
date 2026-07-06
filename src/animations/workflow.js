import { qs, qsa } from "../lib/dom.js";
import { animatedWords, codeWithMarkedValue, selectedCodeBlock } from "../lib/html.js";
import { hasHorizontalAnimationSpace, isSmartphoneAnimationLayout } from "../lib/animation-layout.js";
import { gsap } from "../services/gsap.js";
import { typeCodeText, typeMarkedValue } from "./code-typing.js";
import { addSectionHeadingReveal, setSectionHeadingHidden } from "./section-heading.js";

const WHAT_RESTORED_TITLE_REPEAT_DELAY = 3.6;

/**
 * Updates the dynamic workflow title.
 * @param {string} title Title to render.
 * @param {{ animate?: boolean }} [options] Render options.
 * @returns {void}
 */
export function setWhatTitle(title, options = {}) {
  const titleElement = qs(".what-dynamic-title");
  if (!titleElement) return;
  const animate = options.animate !== false;
  gsap.killTweensOf(qsa(".section-title-word", titleElement));
  titleElement.innerHTML = animatedWords(title, "section-title-word");
  if (!animate) {
    gsap.set(qsa(".section-title-word", titleElement), { autoAlpha: 1, yPercent: 0 });
    return;
  }
  gsap.fromTo(qsa(".section-title-word", titleElement), {
    yPercent: 80,
    autoAlpha: 0,
  }, {
    yPercent: 0,
    autoAlpha: 1,
    stagger: 0.035,
    duration: 0.36,
    ease: "back.out(1.15)",
  });
}

/**
 * Resets workflow code, badges, and active step indicators.
 * @param {{ badge: string }} workflow Workflow scenario data.
 * @returns {void}
 */
export function resetWorkflowVisuals(workflow) {
  const inputCode = qs(".workflow-input-editor .typing-code");
  const outputCode = qs(".workflow-output-editor .typing-code");
  const badges = qsa(".workflow-badge");
  if (inputCode) inputCode.textContent = "";
  if (outputCode) outputCode.textContent = "";
  badges.forEach((badge) => {
    badge.textContent = workflow.badge;
  });
  qsa(".workflow-step").forEach((step) => step.classList.remove("is-active"));
}

/**
 * Builds the workflow explanation timeline.
 * @param {typeof import("../content.js").content.de} localizedContent Localized content object.
 * @param {"desktop-horizontal" | "desktop-vertical" | "smartphone-vertical"} animationLayout Active layout branch.
 * @returns {GSAPTimeline | null}
 */
export function buildWhatWorkflowTimeline(localizedContent, animationLayout) {
  const workflow = qs(".what-workflow");
  if (!workflow) return null;
  const card = workflow.closest("[data-snap-card]");
  const inputEditor = qs(".workflow-input-editor", workflow);
  const outputEditor = qs(".workflow-output-editor", workflow);
  const core = qs(".workflow-core", workflow);
  const logo = qs(".workflow-logo", workflow);
  const leftLine = qs(".workflow-line-left", workflow);
  const rightLine = qs(".workflow-line-right", workflow);
  const lines = qsa(".workflow-line", workflow);
  const inputCode = qs(".workflow-input-editor .typing-code", workflow);
  const outputCode = qs(".workflow-output-editor .typing-code", workflow);
  const steps = localizedContent.what.steps;
  const scenario = localizedContent.what.workflows[0];
  if (!inputEditor || !outputEditor || !core || !logo || !inputCode || !outputCode) return null;
  const adjustedInputCode = scenario.adjustedInputCode || scenario.inputCode;
  const oldValue = scenario.highlightOldValue || "42.0";
  const newValue = scenario.highlightNewValue || "86.5";
  const timing = {
    afterHeading: 0,
    restoredTitleHold: 0,
    repeatDelay: WHAT_RESTORED_TITLE_REPEAT_DELAY,
    editorReveal: 0.52,
    inputType: 1.75,
    afterInput: 1.05,
    selectValue: 0.54,
    afterSelect: 0.82,
    valueType: 1.16,
    afterValue: 0.82,
    beforeCalculate: 0.62,
    lineDraw: 0.42,
    logoEnter: 0.62,
    logoSettle: 0.26,
    outputReveal: 0.5,
    outputType: 1.68,
    selectOutput: 0.58,
    afterOutputSelect: 0.95,
    endHold: 1.65,
  };

  const state = {
    localizedContent,
    animationLayout,
    elements: { inputEditor, outputEditor, core, logo, lines, leftLine, rightLine, inputCode, outputCode },
    steps,
    scenario,
    adjustedInputCode,
    oldValue,
    newValue,
    timing,
  };
  resetWhatWorkflowLayout(state);
  setWhatTitle(localizedContent.what.restoredTitle, { animate: false });
  if (card) setSectionHeadingHidden(card);

  const timeline = gsap.timeline({ paused: true });
  timeline
    .call(() => {
      resetWhatWorkflowLayout(state);
      setWhatTitle(localizedContent.what.restoredTitle, { animate: false });
      if (card) setSectionHeadingHidden(card);
    });
  addSectionHeadingReveal(timeline, card);
  timeline
    .to({}, { duration: timing.afterHeading })
    .add(
      hasHorizontalAnimationSpace(animationLayout)
        ? buildWhatWorkflowHorizontalLoop(state)
        : buildWhatWorkflowStackedLoop(state),
    );
  return timeline;
}

function setActiveWorkflowStep(index, title) {
  qsa(".workflow-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.stepIndex) === index);
  });
  setWhatTitle(title);
}

function resetWhatWorkflowLayout(state) {
  const { animationLayout, elements, scenario } = state;
  const { inputEditor, outputEditor, core, logo, lines, inputCode, outputCode } = elements;
  const verticalOffset = isSmartphoneAnimationLayout(animationLayout) ? 10 : 12;
  const editorOffset = hasHorizontalAnimationSpace(animationLayout) ? 16 : verticalOffset;
  const editorScale = isSmartphoneAnimationLayout(animationLayout) ? 0.98 : 0.985;
  resetWorkflowVisuals(scenario);
  inputCode.textContent = "";
  outputCode.textContent = "";
  gsap.set([inputEditor, outputEditor], { autoAlpha: 0, y: editorOffset, scale: editorScale });
  gsap.set(core, {
    autoAlpha: 0,
    y: hasHorizontalAnimationSpace(animationLayout) ? 0 : verticalOffset,
    scale: hasHorizontalAnimationSpace(animationLayout) ? 0.94 : 0.96,
  });
  gsap.set(logo, { autoAlpha: 0, scale: isSmartphoneAnimationLayout(animationLayout) ? 0.72 : 0.78, rotation: -8 });
  gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
}

function buildWhatWorkflowHorizontalLoop(state) {
  const {
    localizedContent,
    elements,
    steps,
    scenario,
    adjustedInputCode,
    oldValue,
    newValue,
    timing,
  } = state;
  const { inputEditor, outputEditor, core, logo, leftLine, rightLine, inputCode, outputCode } = elements;

  return gsap.timeline({ repeat: -1, repeatDelay: timing.repeatDelay })
    .call(() => resetWhatWorkflowLayout(state))
    .to({}, { duration: timing.restoredTitleHold })
    .call(() => setActiveWorkflowStep(0, steps[0].title))
    .to(inputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: timing.editorReveal, ease: "power3.out" })
    .add(typeCodeText(inputCode, scenario.inputCode, timing.inputType))
    .to({}, { duration: timing.afterInput })
    .call(() => setActiveWorkflowStep(1, steps[1].title))
    .call(() => {
      inputCode.innerHTML = codeWithMarkedValue(scenario.inputCode, oldValue);
    })
    .call(() => {
      const selection = qs(".code-selection", inputEditor);
      if (selection) gsap.to(selection, { duration: timing.selectValue, backgroundColor: "rgba(3, 155, 229, 0.34)", ease: "power2.out" });
    })
    .to({}, { duration: timing.afterSelect })
    .add(typeMarkedValue(inputCode, scenario.inputCode, oldValue, newValue, timing.valueType))
    .call(() => {
      const selection = qs(".code-selection", inputEditor);
      if (selection) gsap.to(selection, { duration: timing.afterValue, backgroundColor: "rgba(3, 155, 229, 0.18)", ease: "power2.out" });
    })
    .to({}, { duration: timing.afterValue })
    .call(() => {
      inputCode.textContent = adjustedInputCode;
    })
    .to({}, { duration: timing.beforeCalculate })
    .call(() => setActiveWorkflowStep(2, steps[2].title))
    .to(core, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: "power3.out" })
    .to(leftLine, { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" })
    .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: timing.logoEnter, ease: "back.out(1.75)" }, "-=0.08")
    .to(logo, { scale: 1, duration: timing.logoSettle, ease: "power2.out" })
    .to(rightLine, { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" }, "-=0.1")
    .to(outputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: timing.outputReveal, ease: "power3.out" }, "-=0.02")
    .add(typeCodeText(outputCode, scenario.outputCode, timing.outputType), "-=0.02")
    .call(() => setActiveWorkflowStep(3, steps[3].title))
    .call(() => {
      outputCode.innerHTML = selectedCodeBlock(scenario.outputCode);
    })
    .call(() => {
      const selection = qs(".code-selection-block", outputEditor);
      if (selection) gsap.to(selection, { duration: timing.selectOutput, backgroundColor: "rgba(3, 155, 229, 0.26)", ease: "power2.out" });
    })
    .to({}, { duration: timing.afterOutputSelect })
    .to({}, { duration: timing.endHold })
    .call(() => {
      qsa(".workflow-step").forEach((step) => step.classList.remove("is-active"));
      setWhatTitle(localizedContent.what.restoredTitle);
    });
}

function buildWhatWorkflowStackedLoop(state) {
  const {
    localizedContent,
    elements,
    steps,
    scenario,
    adjustedInputCode,
    oldValue,
    newValue,
  } = state;
  const { inputEditor, outputEditor, core, logo, inputCode, outputCode } = elements;
  const smartphone = isSmartphoneAnimationLayout(state.animationLayout);
  const timing = {
    repeatDelay: WHAT_RESTORED_TITLE_REPEAT_DELAY,
    restoredTitleHold: 0,
    editorReveal: smartphone ? 0.42 : 0.48,
    inputType: smartphone ? 1.18 : 1.36,
    inputHold: smartphone ? 0.68 : 0.82,
    selectHold: smartphone ? 0.42 : 0.52,
    valueType: smartphone ? 0.82 : 0.92,
    afterValue: smartphone ? 0.78 : 0.95,
    exit: smartphone ? 0.28 : 0.34,
    logoEnter: smartphone ? 0.5 : 0.58,
    logoHold: smartphone ? 0.82 : 1.05,
    outputType: smartphone ? 1.16 : 1.32,
    outputHold: smartphone ? 1.05 : 1.25,
  };

  return gsap.timeline({ repeat: -1, repeatDelay: timing.repeatDelay })
    .call(() => resetWhatWorkflowLayout(state))
    .to({}, { duration: timing.restoredTitleHold })
    .call(() => setActiveWorkflowStep(0, steps[0].title))
    .to(inputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: timing.editorReveal, ease: "power3.out" })
    .add(typeCodeText(inputCode, scenario.inputCode, timing.inputType))
    .to({}, { duration: timing.inputHold })
    .call(() => setActiveWorkflowStep(1, steps[1].title))
    .call(() => {
      inputCode.innerHTML = codeWithMarkedValue(scenario.inputCode, oldValue);
    })
    .call(() => {
      const selection = qs(".code-selection", inputEditor);
      if (selection) gsap.to(selection, { duration: 0.38, backgroundColor: "rgba(3, 155, 229, 0.34)", ease: "power2.out" });
    })
    .to({}, { duration: timing.selectHold })
    .add(typeMarkedValue(inputCode, scenario.inputCode, oldValue, newValue, timing.valueType))
    .call(() => {
      inputCode.textContent = adjustedInputCode;
    })
    .to({}, { duration: timing.afterValue })
    .to(inputEditor, { autoAlpha: 0, y: -10, scale: 0.98, duration: timing.exit, ease: "power2.in" })
    .call(() => setActiveWorkflowStep(2, steps[2].title))
    .to(core, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: "power3.out" })
    .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: timing.logoEnter, ease: "back.out(1.85)" }, "-=0.1")
    .to(logo, { scale: 1, duration: 0.22, ease: "power2.out" })
    .to({}, { duration: timing.logoHold })
    .to(core, { autoAlpha: 0, y: -10, scale: 0.96, duration: timing.exit, ease: "power2.in" })
    .call(() => setActiveWorkflowStep(3, steps[3].title))
    .to(outputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: timing.editorReveal, ease: "power3.out" })
    .add(typeCodeText(outputCode, scenario.outputCode, timing.outputType))
    .call(() => {
      outputCode.innerHTML = selectedCodeBlock(scenario.outputCode);
    })
    .call(() => {
      const selection = qs(".code-selection-block", outputEditor);
      if (selection) gsap.to(selection, { duration: 0.42, backgroundColor: "rgba(3, 155, 229, 0.26)", ease: "power2.out" });
    })
    .to({}, { duration: timing.outputHold })
    .to(outputEditor, { autoAlpha: 0, y: -10, scale: 0.98, duration: timing.exit, ease: "power2.in" })
    .call(() => {
      qsa(".workflow-step").forEach((step) => step.classList.remove("is-active"));
      setWhatTitle(localizedContent.what.restoredTitle);
    });
}
