import { gsap, ScrollTrigger } from "../services/gsap.js";
import {
  activateCenteredCard,
  installCardCentering,
  installCenteredCardTriggers,
  killTimelines,
} from "./card-activation.js";
import { buildDemoTimeline } from "./demo.js";
import { buildHeroTitleTimeline } from "./hero.js";
import { buildModuleTimeline } from "./modules.js";
import { installGlobalOrbits } from "./orbits.js";
import { showReducedMotionState } from "./reduced-motion.js";
import { buildWhatWorkflowTimeline } from "./workflow.js";

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
