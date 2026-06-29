/**
 * Returns the first element matching a selector within a scope.
 * @param {string} selector CSS selector to resolve.
 * @param {ParentNode} [scope=document] DOM scope used for the query.
 * @returns {Element | null}
 */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Returns all elements matching a selector within a scope.
 * @param {string} selector CSS selector to resolve.
 * @param {ParentNode} [scope=document] DOM scope used for the query.
 * @returns {Element[]}
 */
export function qsa(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

/**
 * Registers an event listener and returns its cleanup function.
 * @param {EventTarget | null | undefined} target Event target.
 * @param {string} eventName Event name.
 * @param {EventListenerOrEventListenerObject} handler Listener callback.
 * @param {AddEventListenerOptions | boolean} [options] Listener options.
 * @returns {() => void}
 */
export function on(target, eventName, handler, options) {
  target?.addEventListener(eventName, handler, options);
  return () => target?.removeEventListener(eventName, handler, options);
}
