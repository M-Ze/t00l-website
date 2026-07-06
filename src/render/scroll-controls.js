/**
 * Builds the fixed scroll controls.
 * @returns {HTMLDivElement}
 */
export function scrollControls() {
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
