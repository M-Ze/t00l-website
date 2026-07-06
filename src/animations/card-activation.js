import { qsa, on } from "../lib/dom.js";
import { gsap, ScrollTrigger } from "../services/gsap.js";
import { resetHeroTitleState } from "./hero.js";
import { setHighlightedModuleCard } from "./modules.js";

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
 * Installs ScrollTriggers that activate card timelines near the viewport center.
 * @param {{ centerScrollPosition: (target: Element) => number }} options Centering dependencies.
 * @param {{ activeKey: string | null }} animationState Shared animation state.
 * @returns {void}
 */
export function installCenteredCardTriggers(options, animationState) {
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

/**
 * Installs pointer handlers that center a tapped card and optionally replay it.
 * @param {{
 *   centerScrollPosition: (target: Element) => number,
 *   scrollToCard: (card: Element) => void,
 *   animationState: object,
 *   activateOnCenteredTap: boolean,
 * }} options Card centering dependencies.
 * @returns {() => void}
 */
export function installCardCentering(options) {
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

/**
 * Activates the card nearest to the current centered scroll position.
 * @param {{ centerScrollPosition: (target: Element) => number }} options Centering dependencies.
 * @param {object} animationState Shared animation state.
 * @returns {void}
 */
export function activateCenteredCard(options, animationState) {
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

/**
 * Kills all card timelines owned by the animation state.
 * @param {object} animationState Shared animation state.
 * @returns {void}
 */
export function killTimelines(animationState) {
  [
    animationState.heroTitleTimeline,
    animationState.whatTimeline,
    animationState.demoTimeline,
    animationState.moduleTimeline,
  ].forEach((timeline) => timeline?.kill());
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

function stabilizeActiveCard(card) {
  gsap.killTweensOf(card);
  gsap.set(card, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    filter: "none",
  });
}
