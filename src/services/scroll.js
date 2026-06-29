import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap.js";

const DEFAULT_SCROLL_DURATION_SECONDS = 0.72;

let lenis = null;
let ticker = null;
let scrollUnsubscribe = null;

/**
 * Initializes the shared Lenis instance and keeps it synchronized with GSAP.
 * @param {{ reducedMotion?: boolean, onFrame?: () => void }} [options] Runtime options.
 * @returns {() => void} Cleanup function.
 */
export function initScroll(options = {}) {
  destroyScroll();

  if (options.reducedMotion) {
    ScrollTrigger.refresh();
    return destroyScroll;
  }

  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.08,
    smoothWheel: false,
  });

  const scrollHandler = () => ScrollTrigger.update();
  scrollUnsubscribe = lenis.on("scroll", scrollHandler);
  ticker = (time) => {
    lenis?.raf(time * 1000);
    options.onFrame?.();
  };

  // Lenis must run on GSAP's ticker so ScrollTrigger observes the same frame.
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.refresh();

  return destroyScroll;
}

/**
 * Destroys the shared Lenis instance and its GSAP ticker callback.
 * @returns {void}
 */
export function destroyScroll() {
  if (ticker) {
    gsap.ticker.remove(ticker);
    ticker = null;
  }
  if (typeof scrollUnsubscribe === "function") {
    scrollUnsubscribe();
  }
  scrollUnsubscribe = null;
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}

/**
 * Scrolls to an absolute document position through Lenis when available.
 * @param {number} top Absolute scroll position.
 * @param {{ duration?: number, immediate?: boolean, onComplete?: () => void }} [options] Scroll options.
 * @returns {void}
 */
export function scrollToPosition(top, options = {}) {
  const duration = options.duration ?? DEFAULT_SCROLL_DURATION_SECONDS;
  if (lenis) {
    lenis.scrollTo(top, {
      duration,
      easing: (value) => 1 - Math.pow(1 - value, 3),
      immediate: options.immediate,
      onComplete: options.onComplete,
    });
    return;
  }

  window.scrollTo({
    top,
    behavior: options.immediate ? "auto" : "smooth",
  });
  if (options.onComplete) {
    window.setTimeout(options.onComplete, options.immediate ? 0 : duration * 1000);
  }
}

/**
 * Returns true when Lenis owns smooth scrolling for the page.
 * @returns {boolean}
 */
export function hasSmoothScroll() {
  return Boolean(lenis);
}
