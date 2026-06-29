import { initAnimations } from "./animations/index.js";
import { gsap, ScrollTrigger } from "./services/gsap.js";
import { destroyScroll, initScroll, scrollToPosition } from "./services/scroll.js";
import { siteConfig } from "./site-config.js";
import { content } from "./content.js";
import "./styles.css";

const LANGUAGE_STORAGE_KEY = "t00l-landing-language";
const COMPACT_ANIMATION_QUERY = "(max-width: 560px)";
const SNAP_DURATION_SECONDS = 0.72;
const SNAP_DURATION_MS = SNAP_DURATION_SECONDS * 1000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const app = document.querySelector("#app");
const state = {
  language: initialLanguage(),
  theme: initialTheme(),
  warmup: "idle",
  eventController: null,
  animationCleanup: null,
  snapLocked: false,
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
 * Escapes text for insertion into trusted HTML templates.
 * @param {string} value Text to escape.
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Escapes text for insertion into a double-quoted HTML attribute.
 * @param {string} value Text to escape.
 * @returns {string}
 */
function escapeAttribute(value) {
  return escapeHtml(value);
}

/**
 * Marks the product name with the code-font branding style.
 * @param {string} value Trusted localized text.
 * @returns {string}
 */
function brandText(value) {
  return escapeHtml(value).replaceAll("T00L", '<span class="brand-code">T00L</span>');
}

/**
 * Builds a word-level animation wrapper for title text.
 * @param {string} value Localized title text.
 * @param {string} className Span class used as a GSAP target.
 * @returns {string}
 */
function animatedWords(value, className) {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return `<span class="${className}">${brandText(part)}</span>`;
    })
    .join("");
}

/**
 * Returns true when tile groups need the compact overlaid animation flow.
 * @returns {boolean}
 */
function isMobileLayout() {
  return window.matchMedia(COMPACT_ANIMATION_QUERY).matches;
}

function githubIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.17-3.37-1.17a2.65 2.65 0 0 0-1.11-1.46c-.91-.62.07-.61.07-.61a2.1 2.1 0 0 1 1.53 1.03 2.13 2.13 0 0 0 2.91.83 2.14 2.14 0 0 1 .64-1.34c-2.22-.25-4.56-1.11-4.56-4.94a3.88 3.88 0 0 1 1.03-2.68 3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.48 9.48 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64a3.86 3.86 0 0 1 1.03 2.68c0 3.84-2.34 4.69-4.57 4.94a2.4 2.4 0 0 1 .68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  `;
}

function infoIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path d="M12 10.8v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  `;
}

function mailIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.75 6.75h14.5v10.5H4.75z" />
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m5.25 7.25 6.75 5.5 6.75-5.5" />
    </svg>
  `;
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
    await fetch(target, { mode: "no-cors", cache: "no-store" });
    state.warmup = "ready";
  } catch (_error) {
    state.warmup = "preparing";
  }
  updateWarmupStatus();
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
  app.replaceChildren(buildPage(localizedContent));
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

/**
 * Builds the complete document fragment for the current localized content.
 * @param {typeof content.de} localizedContent Localized content object.
 * @returns {DocumentFragment}
 */
function buildPage(localizedContent) {
  const fragment = document.createDocumentFragment();
  fragment.append(
    backgroundOrbits(),
    header(localizedContent),
    hero(localizedContent),
    whatSection(localizedContent),
    voluminaDemo(localizedContent),
    modules(localizedContent),
    footer(localizedContent),
    scrollControls(localizedContent),
  );
  return fragment;
}

function backgroundOrbits() {
  const element = document.createElement("div");
  element.className = "global-orbits";
  element.setAttribute("aria-hidden", "true");
  element.innerHTML = `
    <span class="global-orbit global-orbit-input"></span>
    <span class="global-orbit global-orbit-tool"></span>
    <span class="global-orbit global-orbit-output"></span>
  `;
  return element;
}

function header(localizedContent) {
  const element = document.createElement("header");
  element.className = "site-header";
  const themeLabel = state.theme === "dark"
    ? localizedContent.nav.themeLight
    : localizedContent.nav.themeDark;
  const themeIcon = state.theme === "dark" ? "&#9728;" : "&#9790;";
  element.innerHTML = `
    <a class="brand" href="#top" aria-label="T00L home">
      <img src="./assets/logo.svg" alt="" width="40" height="40" />
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="#what">${brandText(localizedContent.nav.what)}</a>
      <a href="#volumina">${localizedContent.nav.volumina}</a>
      <a href="#modules">${localizedContent.nav.modules}</a>
      <a class="info-link" href="#footer" aria-label="${localizedContent.nav.footerInfo}">
        ${infoIcon()}
      </a>
    </nav>
    <div class="header-actions">
      <button class="theme-toggle" type="button" aria-label="${themeLabel}" aria-pressed="${state.theme === "dark"}">
        <span class="theme-icon" aria-hidden="true">${themeIcon}</span>
      </button>
      <button class="language-toggle" type="button" aria-label="${localizedContent.nav.language}">
        ${state.language === "de" ? "EN" : "DE"}
      </button>
      <a class="app-link compact app-link-glow" href="${siteConfig.appUrl}" target="_blank" rel="noopener noreferrer">
        ${localizedContent.nav.app}
      </a>
    </div>
  `;
  return element;
}

function hero(localizedContent) {
  const element = document.createElement("main");
  element.id = "top";
  element.className = "hero landing-section";
  element.innerHTML = `
    <div class="section-card hero-card" data-snap-card data-animation-key="hero">
      <section class="hero-copy" aria-labelledby="hero-title">
        <p class="eyebrow">${brandText(localizedContent.hero.eyebrow)}</p>
        <h1 id="hero-title" class="hero-title hero-title-text" aria-label="${escapeAttribute(`${siteConfig.appName}: ${localizedContent.hero.title}`)}">
          <span class="hero-title-layer is-active" data-hero-title="short" aria-hidden="true">
            ${animatedWords(siteConfig.appName, "hero-title-word")}
          </span>
          <span class="hero-title-layer" data-hero-title="long" aria-hidden="true">
            ${animatedWords(localizedContent.hero.title, "hero-title-word")}
          </span>
        </h1>
        <p class="lead">${brandText(localizedContent.hero.description)}</p>
        <div class="hero-actions">
          <a class="app-link primary app-link-glow" href="${siteConfig.appUrl}" target="_blank" rel="noopener noreferrer">
            ${localizedContent.hero.primary}
          </a>
          <a class="secondary-link" href="#what">${brandText(localizedContent.hero.secondary)}</a>
        </div>
        <p class="warmup-status" aria-live="polite"></p>
      </section>
    </div>
  `;
  return element;
}

function whatSection(localizedContent) {
  const section = document.createElement("section");
  section.id = "what";
  section.className = "section what-section landing-section";
  const steps = localizedContent.what.steps
    .map((step, index) => `
      <li class="workflow-step" data-step-index="${index}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <h3>${brandText(step.title.replace(/^\d+\.\s*/, ""))}</h3>
        <p>${brandText(step.body)}</p>
      </li>
    `)
    .join("");
  const firstWorkflow = localizedContent.what.workflows[0];
  section.innerHTML = `
    <div class="section-card what-card" data-snap-card data-animation-key="what">
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.what.label)}</p>
        <h2 class="section-title what-dynamic-title" aria-live="polite">${animatedWords(localizedContent.what.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.what.body)}</p>
      </div>
      <div class="workflow-showcase">
        <ol class="workflow-list workflow-list-compact">${steps}</ol>
        <div class="what-workflow" aria-label="${escapeAttribute(localizedContent.what.label)} workflow">
          <article class="workflow-editor workflow-input-editor">
            <div class="editor-title-row">
              <h3>${localizedContent.what.inputTitle}</h3>
              <span class="workflow-badge">${firstWorkflow.badge}</span>
            </div>
            <pre><code class="typing-code" data-code="${escapeAttribute(firstWorkflow.inputCode)}"></code></pre>
          </article>
          <div class="workflow-core" aria-label="${escapeAttribute(localizedContent.what.centerLabel)}">
            <span class="workflow-line workflow-line-left"></span>
            <img class="workflow-logo" src="./assets/logo.svg" alt="T00L" width="104" height="104" />
            <span class="workflow-line workflow-line-right"></span>
          </div>
          <article class="workflow-editor workflow-output-editor">
            <div class="editor-title-row">
              <h3>${localizedContent.what.outputTitle}</h3>
              <span class="workflow-badge workflow-output-badge">${firstWorkflow.badge}</span>
            </div>
            <pre><code class="typing-code" data-code="${escapeAttribute(firstWorkflow.outputCode)}"></code></pre>
          </article>
        </div>
      </div>
    </div>
  `;
  return section;
}

function voluminaDemo(localizedContent) {
  const section = document.createElement("section");
  section.id = "volumina";
  section.className = "section demo-section landing-section";
  const inputCode = localizedContent.demo.inputCode;
  const outputCode = localizedContent.demo.outputCode;
  section.innerHTML = `
    <div class="section-card demo-card" data-snap-card data-animation-key="volumina">
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.demo.label)}</p>
        <h2 class="section-title">${animatedWords(localizedContent.demo.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.demo.body)}</p>
      </div>
      <div class="demo-grid">
        <article class="code-panel">
          <h3>${localizedContent.demo.inputTitle}</h3>
          <pre><code class="demo-input-code" data-code="${escapeAttribute(inputCode)}"></code></pre>
        </article>
        <article class="profile-panel">
          <h3>${localizedContent.demo.previewTitle}</h3>
          ${voluminaProfileSvg()}
        </article>
        <article class="result-panel">
          <h3>${localizedContent.demo.outputTitle}</h3>
          <pre><code class="demo-output-code" data-code="${escapeAttribute(outputCode)}"></code></pre>
        </article>
      </div>
    </div>
  `;
  return section;
}

function voluminaProfileSvg() {
  const profilePath = "M 76.8 145.8 C 77 96 91 55 103.5 33 C 108.8 24 116.2 20 125.6 19.8 L 384.6 19.9 C 395.4 20.2 402.5 26 407 37.3 C 423.1 72.5 431.6 106.8 431.6 145.8 C 431.6 184.8 423.1 219.1 407 254.3 C 402.5 265.6 393.8 271.8 382.8 271.8 L 123.8 271.7 C 113.1 271.3 106 265.2 101.4 254.3 C 85.3 219.1 76.8 184.8 76.8 145.8 Z";
  return `
    <svg class="profile-svg" viewBox="50 0 405 292" role="img" aria-label="Animated Volumina vessel profile">
      <defs>
        <clipPath id="profile-half-fill">
          <rect class="profile-fill-mask" x="50" y="145.8" width="405" height="146.2" />
        </clipPath>
      </defs>
      <path class="profile-glow" d="${profilePath}" />
      <path class="profile-fill" clip-path="url(#profile-half-fill)" d="${profilePath}" />
      <path class="profile-outline" d="${profilePath}" />
    </svg>
  `;
}

function modules(localizedContent) {
  const section = document.createElement("section");
  section.id = "modules";
  section.className = "section modules-section landing-section";
  const cards = localizedContent.modules.cards
    .map((card) => `<li class="module-card">${brandText(card)}</li>`)
    .join("");
  section.innerHTML = `
    <div class="section-card modules-card" data-snap-card data-animation-key="modules">
      <div class="module-spark" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="section-heading">
        <p class="eyebrow">${brandText(localizedContent.modules.label)}</p>
        <h2 class="section-title module-title">${animatedWords(localizedContent.modules.title, "section-title-word")}</h2>
        <p class="section-description">${brandText(localizedContent.modules.body)}</p>
      </div>
      <ul class="module-grid">${cards}</ul>
    </div>
  `;
  return section;
}

function footer(localizedContent) {
  const element = document.createElement("footer");
  element.id = "footer";
  element.className = "site-footer";
  element.innerHTML = `
    <div>
      <strong class="brand-code">${siteConfig.appName}</strong>
      <p>${brandText(localizedContent.footer.disclaimer)}</p>
    </div>
    <nav aria-label="Footer">
      <a class="footer-icon-link" href="${siteConfig.githubUrl}" target="_blank" rel="noopener noreferrer" aria-label="${localizedContent.footer.github}">
        ${githubIcon()}
      </a>
      <a class="footer-icon-link" href="mailto:${siteConfig.email}" aria-label="${localizedContent.footer.email}">
        ${mailIcon()}
      </a>
    </nav>
    <small>${siteConfig.versionLabel} &middot; ${siteConfig.copyright}</small>
  `;
  return element;
}

function scrollControls() {
  const wrapper = document.createElement("div");
  wrapper.className = "scroll-controls";
  wrapper.innerHTML = `
    <button class="scroll-control scroll-up" type="button" aria-label="Scroll to previous section">
      <span class="scroll-indicator" aria-hidden="true"></span>
      <span class="scroll-arrow" aria-hidden="true"></span>
    </button>
    <button class="scroll-control scroll-down" type="button" aria-label="Scroll to next section">
      <span class="scroll-indicator" aria-hidden="true"></span>
      <span class="scroll-arrow" aria-hidden="true"></span>
    </button>
  `;
  return wrapper;
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
  window.addEventListener("scroll", updateScrollControls, { passive: true, signal });
  window.addEventListener("resize", updateScrollControls, { signal });
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
  if (state.snapLocked) return;
  const direction = event.deltaY > 0 ? 1 : -1;
  const sections = snapTargets();
  const activeIndex = currentSnapIndex();
  const nextIndex = activeIndex + direction;
  if (nextIndex < 0 || nextIndex >= sections.length) return;
  scrollToAdjacentSection(direction);
}

function handleScrollControlProximity(event) {
  state.pointerY = event.clientY;
  updateScrollControls();
}

function updateScrollControls() {
  const up = document.querySelector(".scroll-up");
  const down = document.querySelector(".scroll-down");
  if (!up || !down) return;
  const activeIndex = currentSnapIndex();
  const canUp = activeIndex > 0 || window.scrollY > 24;
  const canDown = activeIndex < snapTargets().length - 1;
  const hasPointer = state.pointerY >= 0;
  const nearTop = hasPointer && state.pointerY < Math.min(128, window.innerHeight * 0.18);
  const nearBottom = hasPointer && state.pointerY > window.innerHeight - Math.min(150, window.innerHeight * 0.22);
  setScrollControlState(up, canUp, canUp && nearTop, -1);
  setScrollControlState(down, canDown, canDown && nearBottom, 1);
}

function setScrollControlState(button, available, near, direction) {
  button.classList.toggle("is-available", available);
  button.classList.toggle("is-near", near);
  if (reducedMotion.matches) return;
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
  initScroll({
    reducedMotion: reducedMotion.matches,
    onFrame: updateScrollControls,
  });
  state.animationCleanup = initAnimations({
    root: document,
    localizedContent,
    reducedMotion,
    isMobileLayout,
    centerScrollPosition: targetScrollPosition,
    scrollToCard: scrollToTarget,
    updateScrollControls,
  });
  ScrollTrigger.refresh();
}

render({ resetPosition: true });
warmupApp();
