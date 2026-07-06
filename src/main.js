import { initAnimations } from "./animations/index.js";
import { animationLayoutForViewport } from "./lib/animation-layout.js";
import { buildPage } from "./render/page.js";
import { gsap, ScrollTrigger } from "./services/gsap.js";
import { destroyScroll, initScroll, scrollToPosition } from "./services/scroll.js";
import { siteConfig } from "./site-config.js";
import { content } from "./content.js";
import "./styles.css";

const LANGUAGE_STORAGE_KEY = "t00l-landing-language";
const SNAP_DURATION_SECONDS = 0.72;
const SNAP_DURATION_MS = SNAP_DURATION_SECONDS * 1000;
const SCROLL_SETTLE_DELAY_MS = 190;
const SCROLL_SETTLE_TOLERANCE = 28;
const SCROLL_ADVANCE_THRESHOLD = 42;
const RENDER_WARMUP_TIMEOUT_MS = 45000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const app = document.querySelector("#app");
const state = {
  language: initialLanguage(),
  theme: initialTheme(),
  warmup: "idle",
  eventController: null,
  animationCleanup: null,
  animationLayout: animationLayoutForViewport(),
  snapLocked: false,
  scrollGuideDismissed: false,
  scrollSettleTimer: 0,
  scrollDirection: 0,
  lastScrollY: window.scrollY,
  pointerY: -1,
};

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

window.addEventListener("beforeunload", () => {
  window.scrollTo(0, 0);
});

window.addEventListener("pageshow", () => {
  resetPagePosition();
});

resetPagePosition();

/**
 * Returns the language that should be active for the first render.
 * @returns {"de" | "en"}
 */
function initialLanguage() {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "de" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}

/**
 * Returns the persisted or system-preferred visual theme.
 * @returns {"light" | "dark"}
 */
function initialTheme() {
  const stored = window.localStorage.getItem(siteConfig.themeStorageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Safely starts the configured Render service before the visitor clicks the app link.
 * @returns {Promise<void>}
 */
async function warmupApp() {
  const target = siteConfig.warmupUrl || siteConfig.appUrl;
  if (!siteConfig.renderWarmupEnabled || !target) {
    state.warmup = "unavailable";
    updateWarmupStatus();
    return;
  }
  state.warmup = "preparing";
  updateWarmupStatus();
  try {
    await waitForRenderLoad(target, RENDER_WARMUP_TIMEOUT_MS);
    state.warmup = "ready";
  } catch (_error) {
    state.warmup = "preparing";
  }
  updateWarmupStatus();
}

/**
 * Loads the Render app in a hidden frame so the CTA glow only starts after page load.
 * @param {string} url App URL to warm up.
 * @param {number} timeoutMs Maximum wait before leaving the app in preparing state.
 * @returns {Promise<void>}
 */
function waitForRenderLoad(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    let settled = false;

    const settle = (callback) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      frame.removeEventListener("load", handleLoad);
      frame.removeEventListener("error", handleError);
      frame.remove();
      callback();
    };
    const handleLoad = () => settle(resolve);
    const handleError = () => settle(() => reject(new Error("Render warmup failed")));
    const timeout = window.setTimeout(() => {
      settle(() => reject(new Error("Render warmup timed out")));
    }, timeoutMs);

    frame.className = "render-warmup-frame";
    frame.title = "T00L app warmup";
    frame.tabIndex = -1;
    frame.loading = "eager";
    frame.referrerPolicy = "no-referrer";
    frame.setAttribute("aria-hidden", "true");
    frame.addEventListener("load", handleLoad, { once: true });
    frame.addEventListener("error", handleError, { once: true });
    frame.src = url;
    document.body.append(frame);
  });
}

/**
 * Renders the full landing page shell for the active language and theme.
 * @param {{ resetPosition?: boolean, targetSectionId?: string }} [options] Render behavior.
 * @returns {void}
 */
function render(options = {}) {
  const localizedContent = content[state.language];
  document.documentElement.lang = state.language;
  document.title = siteConfig.appName;
  applyTheme();
  resetAnimationState();
  app.replaceChildren(buildPage({
    localizedContent,
    language: state.language,
    theme: state.theme,
  }));
  installEvents();
  updateWarmupStatus();
  if (options.targetSectionId && !options.resetPosition) {
    jumpToSection(options.targetSectionId);
  }
  runAnimations(localizedContent);
  updateScrollControls();
  if (options.resetPosition) {
    resetPagePosition();
  } else if (options.targetSectionId) {
    jumpToSection(options.targetSectionId);
  }
}

/**
 * Applies the current theme to the document root and browser chrome metadata.
 * @returns {void}
 */
function applyTheme() {
  const dark = state.theme === "dark";
  document.documentElement.dataset.theme = state.theme;
  document.body.classList.toggle("body--dark", dark);
  document.documentElement.style.colorScheme = state.theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", dark ? "#101722" : "#f7f8fa");
}

function updateThemeControl() {
  const localizedContent = content[state.language];
  const button = document.querySelector(".theme-toggle");
  if (!button) return;
  const dark = state.theme === "dark";
  button.setAttribute("aria-label", dark ? localizedContent.nav.themeLight : localizedContent.nav.themeDark);
  button.setAttribute("aria-pressed", String(dark));
  const icon = button.querySelector(".theme-icon");
  if (icon) icon.innerHTML = dark ? "&#9728;" : "&#9790;";
}

function installEvents() {
  if (state.eventController) state.eventController.abort();
  state.eventController = new AbortController();
  const { signal } = state.eventController;

  document.querySelector(".language-toggle")?.addEventListener("click", () => {
    const activeSectionId = activeLandingSectionId();
    state.language = state.language === "de" ? "en" : "de";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
    render({ targetSectionId: activeSectionId });
  }, { signal });

  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(siteConfig.themeStorageKey, state.theme);
    applyTheme();
    updateThemeControl();
  }, { signal });

  document.addEventListener("click", handleAnchorClick, { signal });
  document.querySelector(".scroll-down")?.addEventListener("click", () => scrollToAdjacentSection(1), { signal });
  document.querySelector(".scroll-up")?.addEventListener("click", () => scrollToAdjacentSection(-1), { signal });
  window.addEventListener("mousemove", handleScrollControlProximity, { signal });
  document.addEventListener("wheel", handleWheelSnap, { capture: true, passive: false, signal });
  window.addEventListener("scroll", handleScrollActivity, { passive: true, signal });
  window.addEventListener("resize", handleResize, { signal });
}

function handleAnchorClick(event) {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute("href"));
  if (!target) return;
  event.preventDefault();
  scrollToTarget(target);
}

function resetPagePosition() {
  if (window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
}

function resetAnimationState() {
  if (state.animationCleanup) {
    state.animationCleanup();
    state.animationCleanup = null;
  }
  clearScrollSettleTimer();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  gsap.killTweensOf(".scroll-control");
  destroyScroll();
}

function updateWarmupStatus() {
  const element = document.querySelector(".warmup-status");
  if (!element) return;
  const heroContent = content[state.language].hero;
  const labels = {
    idle: heroContent.warmupPreparing,
    preparing: heroContent.warmupPreparing,
    ready: heroContent.warmupReady,
    unavailable: heroContent.warmupUnavailable,
  };
  element.textContent = labels[state.warmup];
  element.dataset.state = state.warmup;
  document.querySelectorAll(".app-link").forEach((link) => {
    link.dataset.state = state.warmup;
    link.classList.toggle("app-link-glow", state.warmup === "ready");
  });
}

function snapTargets() {
  return [...document.querySelectorAll(".landing-section, .site-footer")];
}

function activeLandingSectionId() {
  return snapTargets()[currentSnapIndex()]?.id || "top";
}

function currentSnapIndex() {
  const positions = snapTargets().map((target) => targetScrollPosition(target));
  const currentPosition = window.scrollY;
  return positions.reduce((closestIndex, position, index) => {
    const closestDistance = Math.abs(positions[closestIndex] - currentPosition);
    const distance = Math.abs(position - currentPosition);
    return distance < closestDistance ? index : closestIndex;
  }, 0);
}

function scrollToTarget(target) {
  clearScrollSettleTimer();
  const top = targetScrollPosition(target);
  state.snapLocked = true;
  window.setTimeout(() => {
    state.snapLocked = false;
  }, reducedMotion.matches ? 260 : SNAP_DURATION_MS + 120);
  scrollToPosition(top, {
    duration: SNAP_DURATION_SECONDS,
    immediate: reducedMotion.matches,
  });
}

function targetScrollPosition(target) {
  if (target.id === "footer") {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  const snapCard = snapCardForTarget(target);
  if (!snapCard) return 0;
  const rect = snapCard.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const usableViewportCenter = headerHeight + Math.max(0, window.innerHeight - headerHeight) / 2;
  return clampScrollPosition(absoluteTop + rect.height / 2 - usableViewportCenter);
}

function snapCardForTarget(target) {
  if (target.matches?.("[data-snap-card]")) return target;
  return target.querySelector?.("[data-snap-card]") || target;
}

function clampScrollPosition(top) {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, top), maxScroll);
}

function jumpToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const jump = () => {
    const top = targetScrollPosition(target);
    scrollToPosition(top, { immediate: true });
    window.scrollTo(0, top);
    updateScrollControls();
    ScrollTrigger.refresh();
  };
  window.requestAnimationFrame(() => {
    jump();
    window.requestAnimationFrame(jump);
    window.setTimeout(jump, 120);
  });
}

function scrollToAdjacentSection(direction) {
  state.scrollGuideDismissed = true;
  const targets = snapTargets();
  const activeIndex = currentSnapIndex();
  const nextIndex = Math.min(Math.max(activeIndex + direction, 0), targets.length - 1);
  const target = targets[nextIndex];
  if (!target || nextIndex === activeIndex) return;
  scrollToTarget(target);
}

function handleWheelSnap(event) {
  if (Math.abs(event.deltaY) < 8 || event.ctrlKey) return;
  event.preventDefault();
  event.stopPropagation();
  state.scrollGuideDismissed = true;
  if (state.snapLocked) return;
  const direction = event.deltaY > 0 ? 1 : -1;
  const sections = snapTargets();
  const activeIndex = currentSnapIndex();
  const nextIndex = activeIndex + direction;
  if (nextIndex < 0 || nextIndex >= sections.length) return;
  scrollToAdjacentSection(direction);
}

function handleScrollActivity() {
  const currentY = window.scrollY;
  state.scrollDirection = Math.sign(currentY - state.lastScrollY);
  state.lastScrollY = currentY;
  if (currentY > 16) state.scrollGuideDismissed = true;
  updateScrollControls();
  scheduleScrollSettleSnap();
}

function handleResize() {
  const nextLayout = animationLayoutForViewport();
  if (nextLayout !== state.animationLayout) {
    const activeSectionId = activeLandingSectionId();
    state.animationLayout = nextLayout;
    runAnimations(content[state.language]);
    jumpToSection(activeSectionId);
    return;
  }
  updateScrollControls();
  ScrollTrigger.refresh();
  scheduleScrollSettleSnap();
}

function scheduleScrollSettleSnap() {
  clearScrollSettleTimer();
  if (state.snapLocked) return;
  state.scrollSettleTimer = window.setTimeout(() => {
    state.scrollSettleTimer = 0;
    settleScrollToNearestCard();
  }, SCROLL_SETTLE_DELAY_MS);
}

function clearScrollSettleTimer() {
  if (!state.scrollSettleTimer) return;
  window.clearTimeout(state.scrollSettleTimer);
  state.scrollSettleTimer = 0;
}

function settleScrollToNearestCard() {
  if (state.snapLocked) return;
  const targets = snapTargets();
  const activeIndex = currentSnapIndex();
  const activeTarget = targets[activeIndex];
  if (!activeTarget) return;

  const centeredPosition = targetScrollPosition(activeTarget);
  const offsetFromCenter = window.scrollY - centeredPosition;
  if (Math.abs(offsetFromCenter) <= SCROLL_SETTLE_TOLERANCE) return;

  let targetIndex = activeIndex;
  if (state.scrollDirection > 0 && offsetFromCenter > SCROLL_ADVANCE_THRESHOLD) {
    targetIndex = Math.min(activeIndex + 1, targets.length - 1);
  } else if (state.scrollDirection < 0 && offsetFromCenter < -SCROLL_ADVANCE_THRESHOLD) {
    targetIndex = Math.max(activeIndex - 1, 0);
  }
  scrollToTarget(targets[targetIndex]);
}

function handleScrollControlProximity(event) {
  state.pointerY = event.clientY;
  updateScrollControls();
}

function updateScrollControls() {
  const up = document.querySelector(".scroll-up");
  const down = document.querySelector(".scroll-down");
  updateActiveHeaderLink();
  if (!up || !down) return;
  const activeIndex = currentSnapIndex();
  const canUp = activeIndex > 0 || window.scrollY > 24;
  const canDown = activeIndex < snapTargets().length - 1;
  const hasPointer = state.pointerY >= 0;
  const nearTop = hasPointer && state.pointerY < Math.min(128, window.innerHeight * 0.18);
  const nearBottom = hasPointer && state.pointerY > window.innerHeight - Math.min(150, window.innerHeight * 0.22);
  const guideDown = !state.scrollGuideDismissed && activeIndex === 0 && window.scrollY < 12 && canDown;
  setScrollControlState(up, canUp, canUp && nearTop, -1);
  setScrollControlState(down, canDown, canDown && (nearBottom || guideDown), 1);
  down.classList.toggle("is-guiding", guideDown);
}

function updateActiveHeaderLink() {
  const activeId = activeLandingSectionId();
  document.querySelectorAll(".site-header a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const linkedId = href.startsWith("#") ? href.slice(1) : "";
    const isActive = (activeId === "top" && link.classList.contains("brand")) || linkedId === activeId;
    link.classList.toggle("is-active-location", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setScrollControlState(button, available, near, direction) {
  button.classList.toggle("is-available", available);
  button.classList.toggle("is-near", near);
  if (reducedMotion.matches) {
    button.style.opacity = available ? "1" : "0";
    button.style.visibility = available ? "visible" : "hidden";
    return;
  }
  gsap.to(button, {
    autoAlpha: available ? 1 : 0,
    scale: near ? 1.08 : 0.88,
    y: near ? 0 : direction * 4,
    duration: 0.22,
    ease: near ? "back.out(1.7)" : "power2.out",
    overwrite: true,
  });
}

function runAnimations(localizedContent) {
  resetAnimationState();
  state.animationLayout = animationLayoutForViewport();
  initScroll({
    reducedMotion: reducedMotion.matches,
    onFrame: updateScrollControls,
  });
  state.animationCleanup = initAnimations({
    root: document,
    localizedContent,
    reducedMotion,
    animationLayout: state.animationLayout,
    centerScrollPosition: targetScrollPosition,
    scrollToCard: scrollToTarget,
    updateScrollControls,
  });
  ScrollTrigger.refresh();
}

render({ resetPosition: true });
warmupApp();
