import { qs, qsa } from "../lib/dom.js";
import { gsap } from "../services/gsap.js";

/**
 * Hides a section heading before its card timeline starts.
 * @param {Element | null} card Card that owns the heading.
 * @returns {void}
 */
export function setSectionHeadingHidden(card) {
  if (!card) return;
  const heading = qs(".section-heading", card);
  if (!heading) return;
  gsap.set(heading, { autoAlpha: 0, y: 10 });
  gsap.set(qsa(".section-title-word", heading), { autoAlpha: 0, yPercent: 70 });
}

/**
 * Shows a section heading immediately for reduced-motion users.
 * @param {Element | null} card Card that owns the heading.
 * @returns {void}
 */
export function setSectionHeadingVisible(card) {
  if (!card) return;
  const heading = qs(".section-heading", card);
  if (!heading) return;
  gsap.set(heading, { autoAlpha: 1, y: 0 });
  gsap.set(qsa(".section-title-word", heading), { autoAlpha: 1, yPercent: 0 });
}

/**
 * Adds the shared section-heading reveal to a timeline.
 * @param {GSAPTimeline} timeline Timeline that receives the reveal.
 * @param {Element | null} card Card that owns the heading.
 * @returns {GSAPTimeline}
 */
export function addSectionHeadingReveal(timeline, card) {
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
