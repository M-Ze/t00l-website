/**
 * Builds the global decorative orbit layer.
 * @returns {HTMLDivElement}
 */
export function backgroundOrbits() {
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
