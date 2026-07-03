import { qs, qsa, on } from "../lib/dom.js";
import { gsap, ScrollTrigger } from "../services/gsap.js";

const POINTER_TAP_MAX_DISTANCE = 10;
const CENTER_TRIGGER_TOLERANCE = 26;
const WHAT_RESTORED_TITLE_REPEAT_DELAY = 3.6;
const ANIMATION_LAYOUTS = Object.freeze({
  DESKTOP_HORIZONTAL: "desktop-horizontal",
  DESKTOP_VERTICAL: "desktop-vertical",
  SMARTPHONE_VERTICAL: "smartphone-vertical",
});
const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  '[role="button"]',
  '[role="link"]',
].join(",");

/**
 * Initializes all GSAP-driven page animations and centered card activation.
 * @param {{
 *   root?: ParentNode,
 *   localizedContent: import("../content.js").content["de"],
 *   reducedMotion: MediaQueryList,
 *   animationLayout: "desktop-horizontal" | "desktop-vertical" | "smartphone-vertical",
 *   centerScrollPosition: (target: Element) => number,
 *   scrollToCard: (card: Element) => void,
 *   updateScrollControls: () => void,
 * }} options Animation runtime dependencies.
 * @returns {() => void} Cleanup function for animations, triggers, and card listeners.
 */
export function initAnimations(options) {
  const root = options.root || document;
  const animationState = {
    activeKey: null,
    heroTitleTimeline: null,
    whatTimeline: null,
    demoTimeline: null,
    moduleTimeline: null,
  };
  const cleanupFns = [];
  let initialActivationFrame = 0;

  const ctx = gsap.context(() => {
    if (options.reducedMotion.matches) {
      showReducedMotionState(options.localizedContent, options.animationLayout);
      cleanupFns.push(installCardCentering({ ...options, animationState, activateOnCenteredTap: false }));
      return;
    }

    installGlobalOrbits();
    animationState.heroTitleTimeline = buildHeroTitleTimeline(root);
    animationState.whatTimeline = buildWhatWorkflowTimeline(options.localizedContent, options.animationLayout);
    animationState.demoTimeline = buildDemoTimeline(options.animationLayout);
    animationState.moduleTimeline = buildModuleTimeline(options.animationLayout);
    installCenteredCardTriggers(options, animationState);
    cleanupFns.push(installCardCentering({ ...options, animationState, activateOnCenteredTap: true }));

    initialActivationFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      activateCenteredCard(options, animationState);
    });
  }, root);

  return () => {
    cleanupFns.forEach((cleanup) => cleanup());
    if (initialActivationFrame) window.cancelAnimationFrame(initialActivationFrame);
    killTimelines(animationState);
    ctx.revert();
  };
}

function installGlobalOrbits() {
  gsap.to(".global-orbit-input", { rotation: 360, duration: 24, repeat: -1, ease: "none" });
  gsap.to(".global-orbit-tool", { rotation: -360, duration: 31, repeat: -1, ease: "none" });
  gsap.to(".global-orbit-output", { rotation: 360, duration: 39, repeat: -1, ease: "none" });
  gsap.to(".global-orbits", {
    yPercent: -6,
    xPercent: 2,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true },
  });
}

function installCenteredCardTriggers(options, animationState) {
  qsa("[data-snap-card]", document).forEach((card) => {
    ScrollTrigger.create({
      trigger: card,
      start: () => options.centerScrollPosition(card) - CENTER_TRIGGER_TOLERANCE,
      end: () => options.centerScrollPosition(card) + CENTER_TRIGGER_TOLERANCE,
      invalidateOnRefresh: true,
      onEnter: () => activateCard(card, animationState),
      onEnterBack: () => activateCard(card, animationState),
      onLeave: () => pauseCard(card, animationState),
      onLeaveBack: () => pauseCard(card, animationState),
    });
  });
}

function installCardCentering(options) {
  let pointerStart = null;

  const cleanupPointerDown = on(document, "pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(INTERACTIVE_SELECTOR)) return;
    const card = event.target.closest("[data-snap-card]");
    if (!card) return;
    pointerStart = {
      card,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }, { passive: true });

  const cleanupPointerUp = on(document, "pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const { card, x, y } = pointerStart;
    pointerStart = null;
    if (event.target.closest(INTERACTIVE_SELECTOR)) return;
    const distance = Math.hypot(event.clientX - x, event.clientY - y);
    if (distance > POINTER_TAP_MAX_DISTANCE) return;
    const alreadyCentered = isCardCentered(card, options.centerScrollPosition);
    options.scrollToCard(card);
    if (alreadyCentered && options.activateOnCenteredTap) {
      activateCard(card, options.animationState);
    }
  }, { passive: true });

  const cleanupPointerCancel = on(document, "pointercancel", () => {
    pointerStart = null;
  }, { passive: true });

  return () => {
    cleanupPointerDown();
    cleanupPointerUp();
    cleanupPointerCancel();
  };
}

function activateCenteredCard(options, animationState) {
  const cards = qsa("[data-snap-card]", document);
  const centeredCard = cards.reduce((closest, card) => {
    const distance = Math.abs(window.scrollY - options.centerScrollPosition(card));
    if (!closest || distance < closest.distance) return { card, distance };
    return closest;
  }, null);
  if (centeredCard && centeredCard.distance <= CENTER_TRIGGER_TOLERANCE + 4) {
    activateCard(centeredCard.card, animationState);
  }
}

function isCardCentered(card, centerScrollPosition) {
  return Math.abs(window.scrollY - centerScrollPosition(card)) <= CENTER_TRIGGER_TOLERANCE + 4;
}

function activateCard(card, animationState) {
  const key = card.dataset.animationKey;
  if (!key) return;
  if (animationState.activeKey === key) return;
  pauseOtherTimelines(animationState, key);
  stabilizeActiveCard(card);
  restartTimelineForKey(animationState, key);
  animationState.activeKey = key;
}

function pauseCard(card, animationState) {
  const key = card.dataset.animationKey;
  if (!key || animationState.activeKey !== key) return;
  pauseTimelineForKey(animationState, key);
  animationState.activeKey = null;
}

function restartTimelineForKey(animationState, key) {
  const timeline = timelineForKey(animationState, key);
  timeline?.restart(true);
}

function pauseTimelineForKey(animationState, key) {
  const timeline = timelineForKey(animationState, key);
  timeline?.pause(0);
  if (key === "hero") resetHeroTitleState();
  if (key === "modules") setHighlightedModuleCard(qsa(".module-card"), -1);
}

function pauseOtherTimelines(animationState, activeKey) {
  ["hero", "what", "volumina", "modules"].forEach((key) => {
    if (key !== activeKey) pauseTimelineForKey(animationState, key);
  });
}

function timelineForKey(animationState, key) {
  if (key === "hero") return animationState.heroTitleTimeline;
  if (key === "what") return animationState.whatTimeline;
  if (key === "volumina") return animationState.demoTimeline;
  if (key === "modules") return animationState.moduleTimeline;
  return null;
}

function killTimelines(animationState) {
  [
    animationState.heroTitleTimeline,
    animationState.whatTimeline,
    animationState.demoTimeline,
    animationState.moduleTimeline,
  ].forEach((timeline) => timeline?.kill());
}

function hasHorizontalAnimationSpace(layout) {
  return layout === ANIMATION_LAYOUTS.DESKTOP_HORIZONTAL;
}

function isSmartphoneAnimationLayout(layout) {
  return layout === ANIMATION_LAYOUTS.SMARTPHONE_VERTICAL;
}

function setSectionHeadingHidden(card) {
  if (!card) return;
  const heading = qs(".section-heading", card);
  if (!heading) return;
  gsap.set(heading, { autoAlpha: 0, y: 10 });
  gsap.set(qsa(".section-title-word", heading), { autoAlpha: 0, yPercent: 70 });
}

function setSectionHeadingVisible(card) {
  if (!card) return;
  const heading = qs(".section-heading", card);
  if (!heading) return;
  gsap.set(heading, { autoAlpha: 1, y: 0 });
  gsap.set(qsa(".section-title-word", heading), { autoAlpha: 1, yPercent: 0 });
}

function addSectionHeadingReveal(timeline, card) {
  if (!card) return timeline;
  const heading = qs(".section-heading", card);
  if (!heading) return timeline;
  const support = qsa(".eyebrow, .section-description", heading);
  const titleWords = qsa(".section-title-word", heading);

  timeline
    .to(heading, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" })
    .fromTo(support, {
      autoAlpha: 0,
      y: 8,
    }, {
      autoAlpha: 1,
      y: 0,
      stagger: 0.04,
      duration: 0.28,
      ease: "power2.out",
    }, "<")
    .fromTo(titleWords, {
      autoAlpha: 0,
      yPercent: 70,
    }, {
      autoAlpha: 1,
      yPercent: 0,
      stagger: 0.035,
      duration: 0.4,
      ease: "back.out(1.16)",
    }, "<0.04");

  return timeline;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function codeWithMarkedValue(codeText, value, className = "code-selection") {
  if (!value) return escapeHtml(codeText);
  const marker = new RegExp(escapeRegExp(value), "u");
  return escapeHtml(codeText).replace(marker, `<span class="${className}">${escapeHtml(value)}</span>`);
}

function selectedCodeBlock(codeText) {
  return `<span class="code-selection-block">${escapeHtml(codeText)}</span>`;
}

function brandText(value) {
  return escapeHtml(value).replaceAll("T00L", '<span class="brand-code">T00L</span>');
}

function animatedWords(value, className) {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return `<span class="${className}">${brandText(part)}</span>`;
    })
    .join("");
}

function typeCodeText(code, text, duration) {
  const cursor = { index: 0 };
  return gsap.fromTo(cursor, { index: 0 }, {
    index: text.length,
    duration,
    ease: "none",
    onStart() {
      code.textContent = "";
    },
    onUpdate() {
      code.textContent = text.slice(0, Math.round(cursor.index));
    },
    onComplete() {
      code.textContent = text;
    },
  });
}

function typeMarkedValue(code, template, oldValue, newValue, duration) {
  const cursor = { index: 0 };
  return gsap.fromTo(cursor, { index: 0 }, {
    index: newValue.length,
    duration,
    ease: "none",
    onUpdate() {
      const nextValue = newValue.slice(0, Math.round(cursor.index));
      const nextCode = template.replace(oldValue, nextValue);
      code.innerHTML = codeWithMarkedValue(nextCode, nextValue, "code-selection is-typing");
    },
    onComplete() {
      code.innerHTML = codeWithMarkedValue(template.replace(oldValue, newValue), newValue);
    },
  });
}

function setActiveHeroTitleLayer(activeLayer, inactiveLayer) {
  gsap.set(inactiveLayer, { autoAlpha: 0 });
  gsap.set(activeLayer, { autoAlpha: 1 });
  activeLayer.classList.add("is-active");
  inactiveLayer.classList.remove("is-active");
}

function resetHeroTitleState() {
  const shortLayer = qs('[data-hero-title="short"]');
  const longLayer = qs('[data-hero-title="long"]');
  if (!shortLayer || !longLayer) return;
  const shortWords = qsa(".hero-title-word", shortLayer);
  const longWords = qsa(".hero-title-word", longLayer);
  setActiveHeroTitleLayer(shortLayer, longLayer);
  gsap.set(shortWords, { autoAlpha: 0, yPercent: 18, scale: 0.72, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(longWords, { autoAlpha: 0, yPercent: 82, scale: 1, clipPath: "inset(100% 0% 0% 0%)" });
}

function buildHeroTitleTimeline(root) {
  const shortLayer = qs('[data-hero-title="short"]', root);
  const longLayer = qs('[data-hero-title="long"]', root);
  if (!shortLayer || !longLayer) return null;
  const shortWords = qsa(".hero-title-word", shortLayer);
  const longWords = qsa(".hero-title-word", longLayer);
  setActiveHeroTitleLayer(shortLayer, longLayer);
  gsap.set(shortWords, { autoAlpha: 0, yPercent: 18, scale: 0.72, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(longWords, { autoAlpha: 0, yPercent: 82, clipPath: "inset(100% 0% 0% 0%)" });

  const timeline = gsap.timeline({ paused: true });
  const titleLoop = gsap.timeline({ repeat: -1 });

  titleLoop
    .to(shortWords, {
      autoAlpha: 0,
      yPercent: -78,
      scale: 0.94,
      clipPath: "inset(0% 0% 100% 0%)",
      stagger: 0.045,
      duration: 0.34,
      ease: "power2.in",
    })
    .set(shortLayer, { autoAlpha: 0 })
    .set(longLayer, { autoAlpha: 1 })
    .call(() => setActiveHeroTitleLayer(longLayer, shortLayer))
    .fromTo(longWords, {
      autoAlpha: 0,
      yPercent: 82,
      clipPath: "inset(100% 0% 0% 0%)",
    }, {
      autoAlpha: 1,
      yPercent: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.052,
      duration: 0.58,
      ease: "back.out(1.18)",
    })
    .to({}, { duration: 3 })
    .to(longWords, {
      autoAlpha: 0,
      yPercent: -62,
      clipPath: "inset(0% 0% 100% 0%)",
      stagger: 0.035,
      duration: 0.32,
      ease: "power2.in",
    })
    .set(longLayer, { autoAlpha: 0 })
    .set(shortLayer, { autoAlpha: 1 })
    .call(() => setActiveHeroTitleLayer(shortLayer, longLayer))
    .fromTo(shortWords, {
      autoAlpha: 0,
      yPercent: 75,
      scale: 0.82,
      clipPath: "inset(100% 0% 0% 0%)",
    }, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.04,
      duration: 0.5,
      ease: "back.out(1.24)",
    })
    .to({}, { duration: 3 });

  timeline
    .call(() => {
      setActiveHeroTitleLayer(shortLayer, longLayer);
      gsap.set(shortWords, { autoAlpha: 0, yPercent: 18, scale: 0.72, clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(longWords, { autoAlpha: 0, yPercent: 82, clipPath: "inset(100% 0% 0% 0%)" });
    })
    .to(shortWords, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.045,
      duration: 0.9,
      ease: "back.out(1.35)",
    })
    .to({}, { duration: 2.35 })
    .add(titleLoop);

  return timeline;
}

function showReducedMotionHeroTitle() {
  const shortLayer = qs('[data-hero-title="short"]');
  const longLayer = qs('[data-hero-title="long"]');
  if (!shortLayer || !longLayer) return;
  const shortWords = qsa(".hero-title-word", shortLayer);
  const longWords = qsa(".hero-title-word", longLayer);
  setActiveHeroTitleLayer(longLayer, shortLayer);
  gsap.set(shortLayer, { autoAlpha: 0 });
  gsap.set(longLayer, { autoAlpha: 1 });
  gsap.set(shortWords, { autoAlpha: 0 });
  gsap.set(longWords, { autoAlpha: 1, yPercent: 0, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
}

function setWhatTitle(title, options = {}) {
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

function setActiveWorkflowStep(index, title) {
  qsa(".workflow-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.stepIndex) === index);
  });
  setWhatTitle(title);
}

function resetWorkflowVisuals(workflow) {
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

function buildWhatWorkflowTimeline(localizedContent, animationLayout) {
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

function stabilizeActiveCard(card) {
  gsap.killTweensOf(card);
  gsap.set(card, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    filter: "none",
  });
}

function buildDemoTimeline(animationLayout) {
  const demoCard = qs(".demo-card");
  if (!demoCard) return null;
  const inputPanel = qs(".code-panel", demoCard);
  const profilePanel = qs(".profile-panel", demoCard);
  const outputPanel = qs(".result-panel", demoCard);
  const inputCode = qs(".demo-input-code", demoCard);
  const outputCode = qs(".demo-output-code", demoCard);
  const profileOutline = qs(".profile-outline", demoCard);
  const profileFillMask = qs(".profile-fill-mask", demoCard);
  const inputText = inputCode?.dataset.code || "";
  const outputText = outputCode?.dataset.code || "";
  if (!inputPanel || !profilePanel || !outputPanel || !inputCode || !outputCode || !profileOutline || !profileFillMask) return null;

  const state = {
    animationLayout,
    elements: { inputPanel, profilePanel, outputPanel, inputCode, outputCode, profileOutline, profileFillMask },
    inputText,
    outputText,
  };
  resetDemoLayout(state);
  setSectionHeadingHidden(demoCard);

  const timeline = gsap.timeline({ paused: true });
  timeline
    .call(() => {
      resetDemoLayout(state);
      setSectionHeadingHidden(demoCard);
    });
  addSectionHeadingReveal(timeline, demoCard);
  timeline
    .to({}, { duration: 0.45 })
    .add(
      hasHorizontalAnimationSpace(animationLayout)
        ? buildDemoHorizontalLoop(state)
        : buildDemoStackedLoop(state),
    );
  return timeline;
}

function resetDemoLayout(state) {
  const { animationLayout, elements } = state;
  const { inputPanel, profilePanel, outputPanel, inputCode, outputCode, profileOutline, profileFillMask } = elements;
  const offset = hasHorizontalAnimationSpace(animationLayout) ? 14 : 6;
  const scale = isSmartphoneAnimationLayout(animationLayout) ? 0.98 : 0.985;
  inputCode.textContent = "";
  outputCode.textContent = "";
  gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 0, y: offset, scale });
  gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
  gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
}

function buildDemoHorizontalLoop(state) {
  const { elements, inputText, outputText } = state;
  const { inputPanel, profilePanel, outputPanel, inputCode, outputCode, profileOutline, profileFillMask } = elements;

  return gsap.timeline({ repeat: -1, repeatDelay: 0.95 })
    .call(() => resetDemoLayout(state))
    .to(inputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power3.out" })
    .add(typeCodeText(inputCode, inputText, 0.95))
    .to(profilePanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power3.out" }, "+=0.08")
    .to(profileOutline, { strokeDashoffset: 0, duration: 0.86, ease: "power2.inOut" })
    .to(profileFillMask, { attr: { y: 145.8, height: 146.2 }, duration: 0.82, ease: "power2.out" }, "-=0.36")
    .to(outputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power3.out" }, "+=0.04")
    .add(typeCodeText(outputCode, outputText, 0.95))
    .to({}, { duration: 0.8 });
}

function buildDemoStackedLoop(state) {
  const { animationLayout, elements, inputText, outputText } = state;
  const { inputPanel, profilePanel, outputPanel, inputCode, outputCode, profileOutline, profileFillMask } = elements;
  const smartphone = isSmartphoneAnimationLayout(animationLayout);
  const timing = {
    repeatDelay: smartphone ? 0.52 : 0.65,
    reveal: smartphone ? 0.4 : 0.46,
    type: smartphone ? 0.98 : 1.08,
    hold: smartphone ? 0.68 : 0.82,
    exit: smartphone ? 0.28 : 0.32,
    outline: smartphone ? 0.78 : 0.92,
    fill: smartphone ? 0.72 : 0.86,
  };

  return gsap.timeline({ repeat: -1, repeatDelay: timing.repeatDelay })
    .call(() => resetDemoLayout(state))
    .to(inputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: timing.reveal, ease: "power3.out" })
    .add(typeCodeText(inputCode, inputText, timing.type))
    .to({}, { duration: timing.hold })
    .to(inputPanel, { autoAlpha: 0, y: -10, scale: 0.98, duration: timing.exit, ease: "power2.in" })
    .to(profilePanel, { autoAlpha: 1, y: 0, scale: 1, duration: timing.reveal, ease: "power3.out" })
    .to(profileOutline, { strokeDashoffset: 0, duration: timing.outline, ease: "power2.inOut" })
    .to(profileFillMask, { attr: { y: 145.8, height: 146.2 }, duration: timing.fill, ease: "power2.out" }, "-=0.34")
    .to({}, { duration: timing.hold })
    .to(profilePanel, { autoAlpha: 0, y: -10, scale: 0.98, duration: timing.exit, ease: "power2.in" })
    .to(outputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: timing.reveal, ease: "power3.out" })
    .add(typeCodeText(outputCode, outputText, timing.type))
    .to({}, { duration: timing.hold + 0.25 })
    .to(outputPanel, { autoAlpha: 0, y: -10, scale: 0.98, duration: timing.exit, ease: "power2.in" });
}

function buildModuleTimeline(animationLayout) {
  const moduleCard = qs(".modules-card");
  const cards = qsa(".module-card", moduleCard || document);
  const sparks = qsa(".module-spark span");
  if (!moduleCard || cards.length === 0) return null;
  const compactLayout = !hasHorizontalAnimationSpace(animationLayout);

  resetModuleLayout(cards, animationLayout);
  setSectionHeadingHidden(moduleCard);
  gsap.set(sparks, { autoAlpha: compactLayout ? 0.44 : 0.5, scale: 1, rotation: 0 });
  gsap.to(sparks, {
    autoAlpha: compactLayout ? 0.32 : 0.38,
    scale: compactLayout ? 0.96 : 0.94,
    duration: compactLayout ? 2.4 : 2.8,
    stagger: 0.18,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });

  const timeline = gsap.timeline({ paused: true });
  timeline
    .call(() => {
      resetModuleLayout(cards, animationLayout);
      setSectionHeadingHidden(moduleCard);
    });
  addSectionHeadingReveal(timeline, moduleCard);
  timeline
    .to(cards, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      duration: compactLayout ? 0.34 : 0.38,
      stagger: compactLayout ? 0.06 : 0.08,
      ease: "power3.out",
    })
    .to({}, { duration: 0.28 })
    .add(buildModuleHighlightLoop(cards, animationLayout));
  return timeline;
}

function resetModuleLayout(cards, animationLayout) {
  const compactLayout = !hasHorizontalAnimationSpace(animationLayout);
  setHighlightedModuleCard(cards, -1);
  gsap.set(cards, {
    autoAlpha: 0,
    y: compactLayout ? 10 : 16,
    scale: compactLayout ? 0.985 : 0.98,
    rotateX: 0,
  });
}

function buildModuleHighlightLoop(cards, animationLayout) {
  const compactLayout = !hasHorizontalAnimationSpace(animationLayout);
  const timeline = gsap.timeline({ repeat: -1, repeatDelay: compactLayout ? 0.25 : 0.35 });
  cards.forEach((card, index) => {
    timeline
      .call(() => setHighlightedModuleCard(cards, index))
      .to(card, {
        y: compactLayout ? -2 : -5,
        scale: compactLayout ? 1.025 : 1.045,
        duration: 0.3,
        ease: "power3.out",
      })
      .to({}, { duration: compactLayout ? 0.95 : 1.12 })
      .to(card, {
        y: 0,
        scale: 1,
        duration: 0.28,
        ease: "power2.out",
      });
  });
  return timeline;
}

function setHighlightedModuleCard(cards, activeIndex) {
  cards.forEach((card, index) => {
    card.classList.toggle("is-highlighted", index === activeIndex);
  });
}

function showReducedMotionState(localizedContent, animationLayout) {
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
