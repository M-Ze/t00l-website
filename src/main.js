import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteConfig } from "./site-config.js";
import { content } from "./content.js";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const LANGUAGE_STORAGE_KEY = "t00l-landing-language";
const MOBILE_LAYOUT_QUERY = "(max-width: 760px)";
const SNAP_DURATION_SECONDS = 0.72;
const SNAP_DURATION_MS = SNAP_DURATION_SECONDS * 1000;
const LOOP_START_DELAY_MS = 1000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const app = document.querySelector("#app");
const state = {
  language: initialLanguage(),
  theme: initialTheme(),
  warmup: "idle",
  eventController: null,
  lenis: null,
  lenisTicker: null,
  snapLocked: false,
  pointerY: -1,
  heroTitleTimeline: null,
  whatTimeline: null,
  demoTimeline: null,
  moduleTimeline: null,
  loopStartTimer: null,
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
 * Escapes a literal string so it can be used in a regular expression.
 * @param {string} value Literal text to escape.
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renders code text while wrapping the first matching value in a selection span.
 * @param {string} codeText Full code text.
 * @param {string} value Value to mark.
 * @param {string} className Selection class.
 * @returns {string}
 */
function codeWithMarkedValue(codeText, value, className = "code-selection") {
  if (!value) return escapeHtml(codeText);
  const marker = new RegExp(escapeRegExp(value), "u");
  return escapeHtml(codeText).replace(marker, `<span class="${className}">${escapeHtml(value)}</span>`);
}

/**
 * Renders a code block as a single selected text range.
 * @param {string} codeText Full code text.
 * @returns {string}
 */
function selectedCodeBlock(codeText) {
  return `<span class="code-selection-block">${escapeHtml(codeText)}</span>`;
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
 * Returns true when the layout has switched to the stacked smartphone flow.
 * @returns {boolean}
 */
function isMobileLayout() {
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
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
  runAnimations();
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
    <div class="section-card hero-card">
      <section class="hero-copy" aria-labelledby="hero-title">
        <p class="eyebrow">${brandText(localizedContent.hero.eyebrow)}</p>
        <h1 id="hero-title" class="hero-title hero-title-gradient" aria-label="${escapeAttribute(`${siteConfig.appName}: ${localizedContent.hero.title}`)}">
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
    <div class="section-card what-card">
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
    <div class="section-card demo-card">
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
    <div class="section-card modules-card">
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
  clearLoopStartTimer();
  if (state.whatTimeline) {
    state.whatTimeline.kill();
    state.whatTimeline = null;
  }
  if (state.heroTitleTimeline) {
    state.heroTitleTimeline.kill();
    state.heroTitleTimeline = null;
  }
  if (state.demoTimeline) {
    state.demoTimeline.kill();
    state.demoTimeline = null;
  }
  if (state.moduleTimeline) {
    state.moduleTimeline.kill();
    state.moduleTimeline = null;
  }
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (state.lenisTicker) {
    gsap.ticker.remove(state.lenisTicker);
    state.lenisTicker = null;
  }
  if (state.lenis) {
    state.lenis.destroy();
    state.lenis = null;
  }
}

function clearLoopStartTimer() {
  if (!state.loopStartTimer) return;
  window.clearTimeout(state.loopStartTimer);
  state.loopStartTimer = null;
}

function pauseLoopTimelines() {
  state.whatTimeline?.pause(0);
  state.demoTimeline?.pause(0);
  state.moduleTimeline?.pause(0);
}

function scheduleSectionLoopStart(sectionId, delayMs = LOOP_START_DELAY_MS) {
  clearLoopStartTimer();
  pauseLoopTimelines();
  if (!sectionId || reducedMotion.matches) return;
  state.loopStartTimer = window.setTimeout(() => {
    if (sectionId === "what") {
      state.whatTimeline?.restart(true);
    } else if (sectionId === "volumina") {
      state.demoTimeline?.restart(true);
    } else if (sectionId === "modules") {
      state.moduleTimeline?.restart(true);
    }
  }, delayMs);
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
  if (state.lenis) {
    state.lenis.scrollTo(top, { duration: SNAP_DURATION_SECONDS, easing: (value) => 1 - Math.pow(1 - value, 3) });
  } else {
    window.scrollTo({ top, behavior: "smooth" });
  }
  scheduleSectionLoopStart(target.id, SNAP_DURATION_MS + LOOP_START_DELAY_MS);
}

function targetScrollPosition(target) {
  if (target.id === "top") return 0;
  if (target.id === "footer") {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const offset = headerHeight > 90 ? Math.min(58, headerHeight * 0.45) : 0;
  return Math.max(0, target.offsetTop - offset);
}

function jumpToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const jump = () => {
    const top = targetScrollPosition(target);
    if (state.lenis) state.lenis.scrollTo(top, { immediate: true });
    window.scrollTo(0, targetScrollPosition(target));
    updateScrollControls();
    ScrollTrigger.refresh();
  };
  window.requestAnimationFrame(() => {
    jump();
    window.requestAnimationFrame(jump);
    window.setTimeout(jump, 120);
  });
  scheduleSectionLoopStart(sectionId, LOOP_START_DELAY_MS);
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

function typeCodeText(code, text, duration) {
  const cursor = { index: 0 };
  return gsap.fromTo(cursor, { index: 0 }, {
    index: text.length,
    duration,
    ease: "none",
    onStart() {
      code.textContent = "";
    },
    onUpdate() {
      code.textContent = text.slice(0, Math.round(cursor.index));
    },
    onComplete() {
      code.textContent = text;
    },
  });
}

function typeMarkedValue(code, template, oldValue, newValue, duration) {
  const cursor = { index: 0 };
  return gsap.fromTo(cursor, { index: 0 }, {
    index: newValue.length,
    duration,
    ease: "none",
    onUpdate() {
      const nextValue = newValue.slice(0, Math.round(cursor.index));
      const nextCode = template.replace(oldValue, nextValue);
      code.innerHTML = codeWithMarkedValue(nextCode, nextValue, "code-selection is-typing");
    },
    onComplete() {
      code.innerHTML = codeWithMarkedValue(template.replace(oldValue, newValue), newValue);
    },
  });
}

function setActiveHeroTitleLayer(activeLayer, inactiveLayer) {
  activeLayer.classList.add("is-active");
  inactiveLayer.classList.remove("is-active");
}

function installHeroTitleLoop() {
  const shortLayer = document.querySelector('[data-hero-title="short"]');
  const longLayer = document.querySelector('[data-hero-title="long"]');
  if (!shortLayer || !longLayer) return;
  const shortWords = shortLayer.querySelectorAll(".hero-title-word");
  const longWords = longLayer.querySelectorAll(".hero-title-word");
  gsap.set(shortLayer, { autoAlpha: 1 });
  gsap.set(longLayer, { autoAlpha: 0 });
  gsap.set(shortWords, { autoAlpha: 0, yPercent: 18, scale: 0.72, filter: "blur(10px)", clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(longWords, { autoAlpha: 0, yPercent: 82, filter: "blur(9px)", clipPath: "inset(100% 0% 0% 0%)" });

  state.heroTitleTimeline = gsap.timeline();
  const titleLoop = gsap.timeline({ repeat: -1 });

  titleLoop
    .to(shortWords, {
      autoAlpha: 0,
      yPercent: -78,
      scale: 0.94,
      filter: "blur(8px)",
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
      filter: "blur(9px)",
      clipPath: "inset(100% 0% 0% 0%)",
    }, {
      autoAlpha: 1,
      yPercent: 0,
      filter: "blur(0px)",
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.052,
      duration: 0.58,
      ease: "back.out(1.18)",
    })
    .to({}, { duration: 3 })
    .to(longWords, {
      autoAlpha: 0,
      yPercent: -62,
      filter: "blur(8px)",
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
      filter: "blur(8px)",
      clipPath: "inset(100% 0% 0% 0%)",
    }, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      filter: "blur(0px)",
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.04,
      duration: 0.5,
      ease: "back.out(1.24)",
    })
    .to({}, { duration: 3 });

  state.heroTitleTimeline
    .to(shortWords, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      filter: "blur(0px)",
      clipPath: "inset(0% 0% 0% 0%)",
      stagger: 0.045,
      duration: 0.9,
      ease: "back.out(1.35)",
    })
    .to({}, { duration: 2.35 })
    .add(titleLoop);
}

function showReducedMotionHeroTitle() {
  const shortLayer = document.querySelector('[data-hero-title="short"]');
  const longLayer = document.querySelector('[data-hero-title="long"]');
  if (!shortLayer || !longLayer) return;
  setActiveHeroTitleLayer(longLayer, shortLayer);
  gsap.set(shortLayer, { autoAlpha: 0 });
  gsap.set(longLayer, { autoAlpha: 1 });
}

function setWhatTitle(title) {
  const titleElement = document.querySelector(".what-dynamic-title");
  if (!titleElement) return;
  titleElement.innerHTML = animatedWords(title, "section-title-word");
  if (reducedMotion.matches) return;
  gsap.fromTo(titleElement.querySelectorAll(".section-title-word"), {
    yPercent: 80,
    opacity: 0,
  }, {
    yPercent: 0,
    opacity: 1,
    stagger: 0.035,
    duration: 0.36,
    ease: "back.out(1.15)",
  });
}

function setActiveWorkflowStep(index, title) {
  document.querySelectorAll(".workflow-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.stepIndex) === index);
  });
  setWhatTitle(title);
}

function resetWorkflowVisuals(workflow) {
  const inputCode = document.querySelector(".workflow-input-editor .typing-code");
  const outputCode = document.querySelector(".workflow-output-editor .typing-code");
  const badges = document.querySelectorAll(".workflow-badge");
  if (inputCode) inputCode.textContent = "";
  if (outputCode) outputCode.textContent = "";
  badges.forEach((badge) => {
    badge.textContent = workflow.badge;
  });
  document.querySelectorAll(".workflow-step").forEach((step) => step.classList.remove("is-active"));
}

function buildWhatWorkflowTimeline() {
  const localizedContent = content[state.language];
  const workflow = document.querySelector(".what-workflow");
  if (!workflow) return null;
  const inputEditor = workflow.querySelector(".workflow-input-editor");
  const outputEditor = workflow.querySelector(".workflow-output-editor");
  const core = workflow.querySelector(".workflow-core");
  const logo = workflow.querySelector(".workflow-logo");
  const lines = workflow.querySelectorAll(".workflow-line");
  const inputCode = workflow.querySelector(".workflow-input-editor .typing-code");
  const outputCode = workflow.querySelector(".workflow-output-editor .typing-code");
  const steps = localizedContent.what.steps;
  const scenario = localizedContent.what.workflows[0];
  if (!inputEditor || !outputEditor || !core || !logo || !inputCode || !outputCode) return null;

  resetWorkflowVisuals(scenario);
  gsap.set([inputEditor, outputEditor], { autoAlpha: 0, y: 18 });
  gsap.set(core, { autoAlpha: isMobileLayout() ? 0 : 1, y: 0 });
  gsap.set(logo, { autoAlpha: 0, scale: 0.78, rotation: -8 });
  gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
  const adjustedInputCode = scenario.adjustedInputCode || scenario.inputCode;
  const oldValue = scenario.highlightOldValue || "42.0";
  const newValue = scenario.highlightNewValue || "86.5";
  const timing = {
    repeatDelay: 1.45,
    editorReveal: 0.52,
    inputType: 1.75,
    afterInput: 0.78,
    selectValue: 0.54,
    afterSelect: 0.6,
    valueType: 1.16,
    afterValue: 0.58,
    beforeCalculate: 0.42,
    lineDraw: 0.42,
    logoEnter: 0.62,
    logoSettle: 0.26,
    outputReveal: 0.5,
    outputType: 1.68,
    selectOutput: 0.58,
    afterOutputSelect: 0.72,
    endHold: 1.3,
  };
  if (isMobileLayout()) {
    return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8 })
      .call(() => {
        resetWorkflowVisuals(scenario);
        setWhatTitle(localizedContent.what.restoredTitle);
        gsap.set([inputEditor, outputEditor], { autoAlpha: 0, y: 18, scale: 0.98 });
        gsap.set(core, { autoAlpha: 0, y: 12, scale: 0.96 });
        gsap.set(logo, { autoAlpha: 0, scale: 0.72, rotation: -8 });
        gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
      })
      .call(() => setActiveWorkflowStep(0, steps[0].title))
      .to(inputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: "power3.out" })
      .add(typeCodeText(inputCode, scenario.inputCode, 1.36))
      .to({}, { duration: 0.55 })
      .call(() => setActiveWorkflowStep(1, steps[1].title))
      .call(() => {
        inputCode.innerHTML = codeWithMarkedValue(scenario.inputCode, oldValue);
      })
      .call(() => {
        const selection = inputEditor.querySelector(".code-selection");
        if (selection) {
          gsap.to(selection, {
            duration: 0.42,
            backgroundColor: "rgba(3, 155, 229, 0.34)",
            ease: "power2.out",
          });
        }
      })
      .to({}, { duration: 0.34 })
      .add(typeMarkedValue(inputCode, scenario.inputCode, oldValue, newValue, 0.92))
      .call(() => {
        inputCode.textContent = adjustedInputCode;
      })
      .to({}, { duration: 0.72 })
      .to(inputEditor, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.34, ease: "power2.in" })
      .call(() => setActiveWorkflowStep(2, steps[2].title))
      .to(core, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: "power3.out" })
      .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: 0.58, ease: "back.out(1.85)" }, "-=0.12")
      .to(logo, { scale: 1, duration: 0.22, ease: "power2.out" })
      .to({}, { duration: 0.76 })
      .to(core, { autoAlpha: 0, y: -10, scale: 0.96, duration: 0.32, ease: "power2.in" })
      .call(() => setActiveWorkflowStep(3, steps[3].title))
      .to(outputEditor, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: "power3.out" })
      .add(typeCodeText(outputCode, scenario.outputCode, 1.32))
      .call(() => {
        outputCode.innerHTML = selectedCodeBlock(scenario.outputCode);
      })
      .call(() => {
        const selection = outputEditor.querySelector(".code-selection-block");
        if (selection) {
          gsap.to(selection, {
            duration: 0.46,
            backgroundColor: "rgba(3, 155, 229, 0.26)",
            ease: "power2.out",
          });
        }
      })
      .to({}, { duration: 1.0 })
      .to(outputEditor, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.34, ease: "power2.in" })
      .call(() => {
        document.querySelectorAll(".workflow-step").forEach((step) => step.classList.remove("is-active"));
        setWhatTitle(localizedContent.what.restoredTitle);
      });
  }

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: timing.repeatDelay });
  timeline
    .call(() => {
      resetWorkflowVisuals(scenario);
      setWhatTitle(localizedContent.what.restoredTitle);
      gsap.set([inputEditor, outputEditor], { autoAlpha: 0, y: 18 });
      gsap.set(core, { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(logo, { autoAlpha: 0, scale: 0.78, rotation: -8 });
      gsap.set(lines, { scaleX: 0, transformOrigin: "50% 50%" });
    })
    .call(() => setActiveWorkflowStep(0, steps[0].title))
    .to(inputEditor, { autoAlpha: 1, y: 0, duration: timing.editorReveal, ease: "power3.out" })
    .add(typeCodeText(inputCode, scenario.inputCode, timing.inputType))
    .to({}, { duration: timing.afterInput })
    .call(() => setActiveWorkflowStep(1, steps[1].title))
    .call(() => {
      inputCode.innerHTML = codeWithMarkedValue(scenario.inputCode, oldValue);
    })
    .call(() => {
      const selection = inputEditor.querySelector(".code-selection");
      if (selection) {
        gsap.to(selection, {
          duration: timing.selectValue,
          backgroundColor: "rgba(3, 155, 229, 0.34)",
          ease: "power2.out",
        });
      }
    })
    .to({}, { duration: timing.afterSelect })
    .add(typeMarkedValue(inputCode, scenario.inputCode, oldValue, newValue, timing.valueType))
    .call(() => {
      const selection = inputEditor.querySelector(".code-selection");
      if (selection) {
        gsap.to(selection, {
          duration: timing.afterValue,
          backgroundColor: "rgba(3, 155, 229, 0.18)",
          ease: "power2.out",
        });
      }
    })
    .to({}, { duration: timing.afterValue })
    .call(() => {
      inputCode.textContent = adjustedInputCode;
    })
    .to({}, { duration: timing.beforeCalculate })
    .call(() => setActiveWorkflowStep(2, steps[2].title))
    .to(".workflow-line-left", { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" })
    .to(logo, { autoAlpha: 1, scale: 1.16, rotation: 0, duration: timing.logoEnter, ease: "back.out(1.75)" }, "-=0.08")
    .to(logo, { scale: 1, duration: timing.logoSettle, ease: "power2.out" })
    .to(".workflow-line-right", { scaleX: 1, duration: timing.lineDraw, ease: "power2.out" }, "-=0.1")
    .to(outputEditor, { autoAlpha: 1, y: 0, duration: timing.outputReveal, ease: "power3.out" }, "-=0.02")
    .add(typeCodeText(outputCode, scenario.outputCode, timing.outputType), "-=0.02")
    .call(() => setActiveWorkflowStep(3, steps[3].title))
    .call(() => {
      outputCode.innerHTML = selectedCodeBlock(scenario.outputCode);
    })
    .call(() => {
      const selection = outputEditor.querySelector(".code-selection-block");
      if (selection) {
        gsap.to(selection, {
          duration: timing.selectOutput,
          backgroundColor: "rgba(3, 155, 229, 0.26)",
          ease: "power2.out",
        });
      }
    })
    .to({}, { duration: timing.afterOutputSelect })
    .to({}, { duration: timing.endHold })
    .call(() => {
      document.querySelectorAll(".workflow-step").forEach((step) => step.classList.remove("is-active"));
      setWhatTitle(localizedContent.what.restoredTitle);
    });
  return timeline;
}

function installWhatWorkflowAnimation() {
  const card = document.querySelector(".what-card");
  state.whatTimeline = buildWhatWorkflowTimeline();
  if (!card || !state.whatTimeline) return;
  if (reducedMotion.matches) {
    const firstWorkflow = content[state.language].what.workflows[0];
    resetWorkflowVisuals(firstWorkflow);
    document.querySelector(".workflow-input-editor .typing-code").textContent = firstWorkflow.adjustedInputCode || firstWorkflow.inputCode;
    document.querySelector(".workflow-output-editor .typing-code").textContent = firstWorkflow.outputCode;
    return;
  }
  ScrollTrigger.create({
    trigger: card,
    start: "top 72%",
    end: "bottom 28%",
    onEnter: () => {
      if (!state.snapLocked) scheduleSectionLoopStart("what");
    },
    onEnterBack: () => {
      if (!state.snapLocked) scheduleSectionLoopStart("what");
    },
    onLeave: () => {
      if (!state.snapLocked) scheduleSectionLoopStart(null);
    },
    onLeaveBack: () => {
      if (!state.snapLocked) scheduleSectionLoopStart(null);
    },
  });
}

function playSectionCardAnimation(card) {
  if (reducedMotion.matches) return;
  const titleWords = card.classList.contains("hero-card")
    ? []
    : card.querySelectorAll(".section-title-word");
  const description = card.querySelector(".section-description, .lead");
  const panels = card.querySelectorAll(".workflow-editor, .workflow-core, .workflow-step, .code-panel, .profile-panel, .result-panel, .module-card");
  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  timeline
    .fromTo(card, {
      autoAlpha: 0,
      y: 26,
      scale: 0.985,
      filter: "blur(8px)",
    }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      duration: 0.46,
    });
  if (titleWords.length) {
    timeline.fromTo(titleWords, {
      yPercent: 110,
      opacity: 0,
    }, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.42,
      ease: "back.out(1.18)",
    }, "-=0.2");
  }
  if (description) {
    timeline.fromTo(description, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, "-=0.14");
  }
  if (panels.length && !card.classList.contains("what-card") && !card.classList.contains("demo-card")) {
    timeline.fromTo(panels, {
      y: 22,
      opacity: 0,
    }, {
      y: 0,
      opacity: 1,
      stagger: 0.06,
      duration: 0.34,
    }, "-=0.12");
  }
}

function installReplayCardAnimations() {
  gsap.utils.toArray(".section-card").forEach((card) => {
    ScrollTrigger.create({
      trigger: card,
      start: "top 78%",
      end: "bottom 22%",
      onEnter: () => playSectionCardAnimation(card),
      onEnterBack: () => playSectionCardAnimation(card),
    });
  });
}

function buildDemoTimeline() {
  const demoCard = document.querySelector(".demo-card");
  if (!demoCard) return null;
  const inputPanel = demoCard.querySelector(".code-panel");
  const profilePanel = demoCard.querySelector(".profile-panel");
  const outputPanel = demoCard.querySelector(".result-panel");
  const inputCode = demoCard.querySelector(".demo-input-code");
  const outputCode = demoCard.querySelector(".demo-output-code");
  const profileOutline = demoCard.querySelector(".profile-outline");
  const profileFillMask = demoCard.querySelector(".profile-fill-mask");
  const inputText = inputCode?.dataset.code || "";
  const outputText = outputCode?.dataset.code || "";
  if (!inputPanel || !profilePanel || !outputPanel || !inputCode || !outputCode || !profileOutline || !profileFillMask) return null;

  inputCode.textContent = "";
  outputCode.textContent = "";
  gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 0, y: 18 });
  gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
  gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
  if (isMobileLayout()) {
    return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.55 })
      .call(() => {
        inputCode.textContent = "";
        outputCode.textContent = "";
        gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 0, y: 18, scale: 0.98 });
        gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
        gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
      })
      .to(inputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, ease: "power3.out" })
      .add(typeCodeText(inputCode, inputText, 1.08))
      .to({}, { duration: 0.72 })
      .to(inputPanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" })
      .to(profilePanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.46, ease: "power3.out" })
      .to(profileOutline, { strokeDashoffset: 0, duration: 0.92, ease: "power2.inOut" })
      .to(profileFillMask, {
        attr: { y: 145.8, height: 146.2 },
        duration: 0.86,
        ease: "power2.out",
      }, "-=0.34")
      .to({}, { duration: 0.76 })
      .to(profilePanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" })
      .to(outputPanel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, ease: "power3.out" })
      .add(typeCodeText(outputCode, outputText, 1.08))
      .to({}, { duration: 1.05 })
      .to(outputPanel, { autoAlpha: 0, y: -12, scale: 0.98, duration: 0.32, ease: "power2.in" });
  }

  return gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.95 })
    .call(() => {
      inputCode.textContent = "";
      outputCode.textContent = "";
      gsap.set([inputPanel, profilePanel, outputPanel], { autoAlpha: 0, y: 18 });
      gsap.set(profileOutline, { strokeDasharray: 1200, strokeDashoffset: 1200 });
      gsap.set(profileFillMask, { attr: { y: 292, height: 0 } });
    })
    .to(inputPanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" })
    .add(typeCodeText(inputCode, inputText, 0.95))
    .to(profilePanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" }, "+=0.08")
    .to(profileOutline, { strokeDashoffset: 0, duration: 0.86, ease: "power2.inOut" })
    .to(profileFillMask, {
      attr: { y: 145.8, height: 146.2 },
      duration: 0.82,
      ease: "power2.out",
    }, "-=0.36")
    .to(outputPanel, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power3.out" }, "+=0.04")
    .add(typeCodeText(outputCode, outputText, 0.95))
    .to({}, { duration: 0.8 });
}

function installDemoLoopAnimation() {
  const demoCard = document.querySelector(".demo-card");
  state.demoTimeline = buildDemoTimeline();
  if (!demoCard || !state.demoTimeline) return;
  if (reducedMotion.matches) {
    const demoContent = content[state.language].demo;
    document.querySelector(".demo-input-code").textContent = demoContent.inputCode;
    document.querySelector(".demo-output-code").textContent = demoContent.outputCode;
    gsap.set(".profile-outline", { strokeDasharray: 0, strokeDashoffset: 0 });
    gsap.set(".profile-fill-mask", { attr: { y: 145.8, height: 146.2 } });
    return;
  }
  ScrollTrigger.create({
    trigger: demoCard,
    start: "top 72%",
    end: "bottom 28%",
    onEnter: () => {
      if (!state.snapLocked) scheduleSectionLoopStart("volumina");
    },
    onEnterBack: () => {
      if (!state.snapLocked) scheduleSectionLoopStart("volumina");
    },
    onLeave: () => {
      if (!state.snapLocked) scheduleSectionLoopStart(null);
    },
    onLeaveBack: () => {
      if (!state.snapLocked) scheduleSectionLoopStart(null);
    },
  });
}

function installModuleAnimation() {
  const moduleCard = document.querySelector(".modules-card");
  if (!moduleCard || reducedMotion.matches) return;
  state.moduleTimeline = buildModuleTimeline();
  ScrollTrigger.create({
    trigger: moduleCard,
    start: "top 76%",
    end: "bottom 24%",
    onEnter: () => {
      if (state.moduleTimeline) {
        state.moduleTimeline.restart(true);
      } else {
        playModuleAnimation();
      }
    },
    onEnterBack: () => {
      if (state.moduleTimeline) {
        state.moduleTimeline.restart(true);
      } else {
        playModuleAnimation();
      }
    },
    onLeave: () => state.moduleTimeline?.pause(0),
    onLeaveBack: () => state.moduleTimeline?.pause(0),
  });
}

function buildModuleTimeline() {
  if (!isMobileLayout()) return null;
  const moduleCard = document.querySelector(".modules-card");
  const cards = [...document.querySelectorAll(".module-card")];
  const sparks = document.querySelectorAll(".module-spark span");
  if (!moduleCard || cards.length === 0) return null;
  gsap.set(cards, { autoAlpha: 0, y: 18, scale: 0.97, rotateX: 0 });
  gsap.set(sparks, { scale: 0.82, opacity: 0.34, rotation: -14 });
  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.35 });
  timeline
    .to(sparks, {
      scale: 1,
      opacity: 0.58,
      rotation: 0,
      duration: 0.52,
      stagger: 0.08,
      ease: "back.out(1.6)",
    }, 0);
  cards.forEach((card, index) => {
    timeline
      .to(card, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        ease: "power3.out",
      }, index === 0 ? ">+=0.08" : ">-0.1")
      .to({}, { duration: 1.35 })
      .to(card, {
        autoAlpha: 0,
        y: -12,
        scale: 0.97,
        duration: 0.32,
        ease: "power2.in",
      });
  });
  return timeline;
}

function playModuleAnimation() {
  gsap.fromTo(".module-spark span", {
    scale: 0,
    opacity: 0,
    rotation: -30,
  }, {
    scale: 1,
    opacity: 1,
    rotation: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: "back.out(1.8)",
  });
  gsap.fromTo(".module-card", {
    y: 26,
    opacity: 0,
    rotateX: -12,
  }, {
    y: 0,
    opacity: 1,
    rotateX: 0,
    stagger: 0.07,
    duration: 0.42,
    ease: "power3.out",
  });
}

function runAnimations() {
  resetAnimationState();
  if (reducedMotion.matches) {
    const firstWorkflow = content[state.language].what.workflows[0];
    const demoContent = content[state.language].demo;
    showReducedMotionHeroTitle();
    document.querySelector(".workflow-input-editor .typing-code").textContent = firstWorkflow.adjustedInputCode || firstWorkflow.inputCode;
    document.querySelector(".workflow-output-editor .typing-code").textContent = firstWorkflow.outputCode;
    document.querySelector(".demo-input-code").textContent = demoContent.inputCode;
    document.querySelector(".demo-output-code").textContent = demoContent.outputCode;
    gsap.set(".profile-fill-mask", { attr: { y: 145.8, height: 146.2 } });
    return;
  }

  const lenis = new Lenis({ lerp: 0.08, smoothWheel: false });
  state.lenis = lenis;
  state.lenisTicker = (time) => {
    lenis.raf(time * 1000);
    updateScrollControls();
  };
  gsap.ticker.add(state.lenisTicker);
  gsap.ticker.lagSmoothing(0);

  gsap.to(".hero-title-gradient", {
    "--title-gradient-x": "100%",
    duration: 3.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  gsap.to(".global-orbit-input", { rotation: 360, duration: 24, repeat: -1, ease: "none" });
  gsap.to(".global-orbit-tool", { rotation: -360, duration: 31, repeat: -1, ease: "none" });
  gsap.to(".global-orbit-output", { rotation: 360, duration: 39, repeat: -1, ease: "none" });
  gsap.to(".global-orbits", {
    yPercent: -6,
    xPercent: 2,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true },
  });
  installHeroTitleLoop();
  installReplayCardAnimations();
  installWhatWorkflowAnimation();
  installDemoLoopAnimation();
  installModuleAnimation();
  ScrollTrigger.refresh();
}

render({ resetPosition: true });
warmupApp();
