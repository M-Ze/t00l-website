import { qs } from "../lib/dom.js";
import { hasHorizontalAnimationSpace, isSmartphoneAnimationLayout } from "../lib/animation-layout.js";
import { gsap } from "../services/gsap.js";
import { typeCodeText } from "./code-typing.js";
import { addSectionHeadingReveal, setSectionHeadingHidden } from "./section-heading.js";

/**
 * Builds the Volumina demonstration timeline.
 * @param {"desktop-horizontal" | "desktop-vertical" | "smartphone-vertical"} animationLayout Active layout branch.
 * @returns {GSAPTimeline | null}
 */
export function buildDemoTimeline(animationLayout) {
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
