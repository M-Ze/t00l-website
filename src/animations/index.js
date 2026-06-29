import { qs, qsa, on } from "../lib/dom.js";
import { gsap, ScrollTrigger } from "../services/gsap.js";

const POINTER_TAP_MAX_DISTANCE = 10;
const CENTER_TRIGGER_TOLERANCE = 26;
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
 *   isMobileLayout: () => boolean,
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
      showReducedMotionState(options.localizedContent);
      cleanupFns.push(installCardCentering({ ...options, animationState, activateOnCenteredTap: false }));
      return;
    }

    installGlobalOrbits();
    animationState.heroTitleTimeline = buildHeroTitleTimeline(root);
    animationState.whatTimeline = buildWhatWorkflowTimeline(options.localizedContent, options.isMobileLayout);
    animationState.demoTimeline = buildDemoTimeline(options.isMobileLayout);
    animationState.moduleTimeline = buildModuleTimeline(options.isMobileLayout);
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
  activeLayer.classList.add("is-active");
  inactiveLayer.classList.remove("is-active");
}

function buildHeroTitleTimeline(root) {
  const shortLayer = qs('[data-hero-title="short"]', root);
  const longLayer = qs('[data-hero-title="long"]', root);
  if (!shortLayer || !longLayer) return null;
  const shortWords = qsa(".hero-title-word", shortLayer);
  const longWords = qsa(".hero-title-word", longLayer);
  gsap.set(shortLayer, { autoAlpha: 1 });
  gsap.set(longLayer, { autoAlpha: 0 });
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
  setActiveHeroTitleLayer(longLayer, shortLayer);
  gsap.set(shortLayer, { autoAlpha: 0 });
  gsap.set(longLayer, { autoAlpha: 1 });
}

function setWhatTitle(title) {
  const titleElement = qs(".what-dynamic-title");
  if (!titleElement) return;
  titleElement.innerHTML = animatedWords(title, "section-title-word");
  gsap.fromTo(qsa(".section-title-word", titleElement), {
    yPercent: 80,
    opacity: 0,
  }, {
    yPercent: 0,
    opacity: 1,
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

function buildWhatWorkflowTimeline(localizedContent, isMobileLayout) {
  const workflow = qs(".what-workflow");
  if (!workflow) return null;
  const inputEditor = qs(".workflow-input-editor", workflow);
  const outputEditor = qs(".workflow-output-editor", workflow);
  const core = qs(".workflow-core", workflow);
  const logo = qs(".workflow-logo", workflow);
  const lines = qsa(".workflow-line", workflow);
  const inputCode = qs(".workflow-input-editor .typing-code", workflow);
  const outputCode = qs(".workflow-output-editor .typing-code", workflow);
  const steps = localizedContent.what.steps;
  const scenario = localizedContent.what.workflows[0];
  if (!inputEditor || !outputEditor || !core || !logo || !inputCode || !outputCode) return null;
  const compactLayout = isMobileLayout();

  resetWorkflowVisuals(scenario);
  gsap.set([inputEditor, outputEditor], { autoAlpha: compactLayout ? 0 : 1, y: compactLayout ? 18 : 0, scale: 1 });
  gsap.set(core, { autoAlpha: compactLayout ? 0 : 1, y: 0, scale: 1 });
  gsap.set(logo, { autoAlpha: 0, scale: 0.78, rotation: -8 });
  gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
  const adjustedInputCode = scenario.adjustedInputCode || scenario.inputCode;
  const oldValue = scenario.highlightOldValue || "42.0";
  const newValue = scenario.highlightNewValue || "86.5";
  const timing = {
    repeatDelay: 1.45,
    editorReveal: 0.52,
    inputType: 1.75,
    afterInput: 0.78,
    selectValue: 0.54,
    afterSelect: 0.6,
    valueType: 1.16,
    afterValue: 0.58,
    beforeCalculate: 0.42,
    lineDraw: 0.42,
    logoEnter: 0.62,
    logoSettle: 0.26,
    outputReveal: 0.5,
    outputType: 1.68,
    selectOutput: 0.58,
    afterOutputSelect: 0.72,
    endHold: 1.3,
  };
  if (compactLayout) {
    return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8 })
      .call(() => {
        resetWorkflowVisuals(scenario);
        setWhatTitle(localizedContent.what.restoredTitle);
        gsap.set([inputEditor, outputEditor], { autoAlpha: 0, y: 18, scale: 0.98 });
        gsap.set(core, { autoAlpha: 0, y: 12, scale: 0.96 });
        gsap.set(logo, { autoAlpha: 0, scale: 0.72, rotation: -8 });
        gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
      })
      .call(() => setActiveWorkflowStep(0, steps[0].title))
      .to(inputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: "power3.out" })
      .add(typeCodeText(inputCode, scenario.inputCode, 1.36))
      .to({}, { duration: 0.55 })
      .call(() => setActiveWorkflowStep(1, steps[1].title))
      .call(() => {
        inputCode.innerHTML = codeWithMarkedValue(scenario.inputCode, oldValue);
      })
      .call(() => {
        const selection = qs(".code-selection", inputEditor);
        if (selection) gsap.to(selection, { duration: 0.42, backgroundColor: "rgba(3, 155, 229, 0.34)", ease: "power2.out" });
      })
      .to({}, { duration: 0.34 })
      .add(typeMarkedValue(inputCode, scenario.inputCode, oldValue, newValue, 0.92))
      .call(() => {
        inputCode.textContent = adjustedInputCode;
      })
      .to({}, { duration: 0.72 })
      .to(inputEditor, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.34, ease: "power2.in" })
      .call(() => setActiveWorkflowStep(2, steps[2].title))
      .to(core, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: "power3.out" })
      .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: 0.58, ease: "back.out(1.85)" }, "-=0.12")
      .to(logo, { scale: 1, duration: 0.22, ease: "power2.out" })
      .to({}, { duration: 0.76 })
      .to(core, { autoAlpha: 0, y: -10, scale: 0.96, duration: 0.32, ease: "power2.in" })
      .call(() => setActiveWorkflowStep(3, steps[3].title))
      .to(outputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: "power3.out" })
      .add(typeCodeText(outputCode, scenario.outputCode, 1.32))
      .call(() => {
        outputCode.innerHTML = selectedCodeBlock(scenario.outputCode);
      })
      .call(() => {
        const selection = qs(".code-selection-block", outputEditor);
        if (selection) gsap.to(selection, { duration: 0.46, backgroundColor: "rgba(3, 155, 229, 0.26)", ease: "power2.out" });
      })
      .to({}, { duration: 1.0 })
      .to(outputEditor, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.34, ease: "power2.in" })
      .call(() => {
        qsa(".workflow-step").forEach((step) => step.classList.remove("is-active"));
        setWhatTitle(localizedContent.what.restoredTitle);
      });
  }

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: timing.repeatDelay });
  timeline
    .call(() => {
      resetWorkflowVisuals(scenario);
      setWhatTitle(localizedContent.what.restoredTitle);
      gsap.set([inputEditor, outputEditor], { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(core, { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(logo, { autoAlpha: 0, scale: 0.78, rotation: -8 });
      gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
    })
    .call(() => setActiveWorkflowStep(0, steps[0].title))
    .to(inputEditor, { autoAlpha: 1, y: 0, duration: timing.editorReveal, ease: "power3.out" })
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
    .to(".workflow-line-left", { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" })
    .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: timing.logoEnter, ease: "back.out(1.75)" }, "-=0.08")
    .to(logo, { scale: 1, duration: timing.logoSettle, ease: "power2.out" })
    .to(".workflow-line-right", { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" }, "-=0.1")
    .to(outputEditor, { autoAlpha: 1, y: 0, duration: timing.outputReveal, ease: "power3.out" }, "-=0.02")
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
  return timeline;
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

function buildDemoTimeline(isMobileLayout) {
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
  const compactLayout = isMobileLayout();

  inputCode.textContent = "";
  outputCode.textContent = "";
  gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: compactLayout ? 0 : 1, y: compactLayout ? 18 : 0, scale: 1 });
  gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
  gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
  if (compactLayout) {
    return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.55 })
      .call(() => {
        inputCode.textContent = "";
        outputCode.textContent = "";
        gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 0, y: 18, scale: 0.98 });
        gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
        gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
      })
      .to(inputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, ease: "power3.out" })
      .add(typeCodeText(inputCode, inputText, 1.08))
      .to({}, { duration: 0.72 })
      .to(inputPanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" })
      .to(profilePanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.46, ease: "power3.out" })
      .to(profileOutline, { strokeDashoffset: 0, duration: 0.92, ease: "power2.inOut" })
      .to(profileFillMask, { attr: { y: 145.8, height: 146.2 }, duration: 0.86, ease: "power2.out" }, "-=0.34")
      .to({}, { duration: 0.76 })
      .to(profilePanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" })
      .to(outputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, ease: "power3.out" })
      .add(typeCodeText(outputCode, outputText, 1.08))
      .to({}, { duration: 1.05 })
      .to(outputPanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" });
  }

  return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.95 })
    .call(() => {
      inputCode.textContent = "";
      outputCode.textContent = "";
      gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
      gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
    })
    .to(inputPanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" })
    .add(typeCodeText(inputCode, inputText, 0.95))
    .to(profilePanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" }, "+=0.08")
    .to(profileOutline, { strokeDashoffset: 0, duration: 0.86, ease: "power2.inOut" })
    .to(profileFillMask, { attr: { y: 145.8, height: 146.2 }, duration: 0.82, ease: "power2.out" }, "-=0.36")
    .to(outputPanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" }, "+=0.04")
    .add(typeCodeText(outputCode, outputText, 0.95))
    .to({}, { duration: 0.8 });
}

function buildModuleTimeline(isMobileLayout) {
  const moduleCard = qs(".modules-card");
  const cards = qsa(".module-card");
  const sparks = qsa(".module-spark span");
  if (!moduleCard || cards.length === 0) return null;
  const compactLayout = isMobileLayout();

  setHighlightedModuleCard(cards, -1);
  gsap.set(cards, { autoAlpha: 1, y: 0, scale: 1, rotateX: 0 });
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

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: compactLayout ? 0.25 : 0.35 });
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

function showReducedMotionState(localizedContent) {
  showReducedMotionHeroTitle();

  const firstWorkflow = localizedContent.what.workflows[0];
  resetWorkflowVisuals(firstWorkflow);
  const inputCode = qs(".workflow-input-editor .typing-code");
  const outputCode = qs(".workflow-output-editor .typing-code");
  if (inputCode) inputCode.textContent = firstWorkflow.adjustedInputCode || firstWorkflow.inputCode;
  if (outputCode) outputCode.textContent = firstWorkflow.outputCode;

  const demoContent = localizedContent.demo;
  const demoInput = qs(".demo-input-code");
  const demoOutput = qs(".demo-output-code");
  if (demoInput) demoInput.textContent = demoContent.inputCode;
  if (demoOutput) demoOutput.textContent = demoContent.outputCode;
  gsap.set(".profile-outline", { strokeDasharray: 0, strokeDashoffset: 0 });
  gsap.set(".profile-fill-mask", { attr: { y: 145.8, height: 146.2 } });
  gsap.set(".module-spark span", { autoAlpha: 0.42, scale: 1, rotation: 0 });
  gsap.set(".module-card", { autoAlpha: 1, y: 0, scale: 1, rotateX: 0 });
  qsa(".module-card").forEach((card) => card.classList.remove("is-highlighted"));
}
