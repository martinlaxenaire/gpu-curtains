class ResizeManager {
  /**
   * ResizeManager constructor
   */
  constructor() {
    this.shouldWatch = true;
    this.entries = [];
    this.resizeObserver = new ResizeObserver((observedEntries) => {
      const allEntries = observedEntries.map((observedEntry) => {
        return this.entries.filter((e) => e.element.isSameNode(observedEntry.target));
      }).flat().sort((a, b) => b.priority - a.priority);
      allEntries?.forEach((entry) => {
        if (entry && entry.callback) {
          entry.callback();
        }
      });
    });
  }
  /**
   * Set {@link shouldWatch}
   * @param shouldWatch - whether to watch or not
   */
  useObserver(shouldWatch = true) {
    this.shouldWatch = shouldWatch;
  }
  /**
   * Track an {@link HTMLElement} size change and execute a callback function when it happens
   * @param entry - {@link ResizeManagerEntry | entry} to watch
   */
  observe({ element, priority, callback }) {
    if (!element || !this.shouldWatch)
      return;
    this.resizeObserver.observe(element);
    const entry = {
      element,
      priority,
      callback
    };
    this.entries.push(entry);
  }
  /**
   * Unobserve an {@link HTMLElement} and remove it from our {@link entries} array
   * @param element - {@link HTMLElement} to unobserve
   */
  unobserve(element) {
    this.resizeObserver.unobserve(element);
    this.entries = this.entries.filter((e) => !e.element.isSameNode(element));
  }
  /**
   * Destroy our {@link ResizeManager}
   */
  destroy() {
    this.resizeObserver.disconnect();
  }
}
const resizeManager = new ResizeManager();

export { ResizeManager, resizeManager };
//# sourceMappingURL=ResizeManager.mjs.map
