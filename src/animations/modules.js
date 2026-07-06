import { qs, qsa } from "../lib/dom.js";
import { hasHorizontalAnimationSpace } from "../lib/animation-layout.js";
import { gsap } from "../services/gsap.js";
import { addSectionHeadingReveal, setSectionHeadingHidden } from "./section-heading.js";

/**
 * Builds the module-card reveal and highlight timeline.
 * @param {"desktop-horizontal" | "desktop-vertical" | "smartphone-vertical"} animationLayout Active layout branch.
 * @returns {GSAPTimeline | null}
 */
export function buildModuleTimeline(animationLayout) {
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

/**
 * Applies the highlighted state to one module card.
 * @param {Element[]} cards Module cards.
 * @param {number} activeIndex Active card index, or -1 for none.
 * @returns {void}
 */
export function setHighlightedModuleCard(cards, activeIndex) {
  cards.forEach((card, index) => {
    card.classList.toggle("is-highlighted", index === activeIndex);
  });
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
