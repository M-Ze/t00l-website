import { codeWithMarkedValue } from "../lib/html.js";
import { gsap } from "../services/gsap.js";

/**
 * Builds a tween that types plain code text into a code element.
 * @param {Element} code Code element to update.
 * @param {string} text Full text to type.
 * @param {number} duration Tween duration in seconds.
 * @returns {GSAPTween}
 */
export function typeCodeText(code, text, duration) {
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

/**
 * Builds a tween that replaces and marks a code value while typing.
 * @param {Element} code Code element to update.
 * @param {string} template Original code text.
 * @param {string} oldValue Value to replace.
 * @param {string} newValue Replacement value.
 * @param {number} duration Tween duration in seconds.
 * @returns {GSAPTween}
 */
export function typeMarkedValue(code, template, oldValue, newValue, duration) {
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
