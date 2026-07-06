import { gsap } from "../services/gsap.js";

/**
 * Starts the global orbit animations and scroll-bound background drift.
 * @returns {void}
 */
export function installGlobalOrbits() {
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
