import { qs, qsa } from "../lib/dom.js";
import { gsap } from "../services/gsap.js";

function setActiveHeroTitleLayer(activeLayer, inactiveLayer) {
  gsap.set(inactiveLayer, { autoAlpha: 0 });
  gsap.set(activeLayer, { autoAlpha: 1 });
  activeLayer.classList.add("is-active");
  inactiveLayer.classList.remove("is-active");
}

/**
 * Resets the hero title layers to the starting animation state.
 * @returns {void}
 */
export function resetHeroTitleState() {
  const shortLayer = qs('[data-hero-title="short"]');
  const longLayer = qs('[data-hero-title="long"]');
  if (!shortLayer || !longLayer) return;
  const shortWords = qsa(".hero-title-word", shortLayer);
  const longWords = qsa(".hero-title-word", longLayer);
  setActiveHeroTitleLayer(shortLayer, longLayer);
  gsap.set(shortWords, { autoAlpha: 0, yPercent: 18, scale: 0.72, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(longWords, { autoAlpha: 0, yPercent: 82, scale: 1, clipPath: "inset(100% 0% 0% 0%)" });
}

/**
 * Builds the looping hero title timeline.
 * @param {ParentNode} root DOM scope for the hero title.
 * @returns {GSAPTimeline | null}
 */
export function buildHeroTitleTimeline(root) {
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

/**
 * Shows the final hero title state without running the title loop.
 * @returns {void}
 */
export function showReducedMotionHeroTitle() {
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
