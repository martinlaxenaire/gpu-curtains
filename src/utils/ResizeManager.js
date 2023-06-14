class ResizeManager {
  constructor() {
    // default to true
    this.shouldWatch = true

    this.entries = []

    this.resizeObserver = new ResizeObserver((observedEntries) => {
      observedEntries.forEach((observedEntry) => {
        const entry = this.entries.find((e) => e.element.isSameNode(observedEntry.target))

        if (entry && entry.callback) {
          entry.callback()
        }
      })
    })
  }

  useObserver(shouldWatch = true) {
    this.shouldWatch = shouldWatch
  }

  observe({ element, callback }) {
    if (!element || !this.shouldWatch) return

    this.resizeObserver.observe(element)

    const entry = {
      element,
      callback,
    }

    this.entries.push(entry)
  }

  unobserve(element) {
    this.resizeObserver.unobserve(element)
    this.entries = this.entries.filter((e) => !e.element.isSameNode(element))
  }

  destroy() {
    this.resizeObserver.disconnect()
  }
}

export const resizeManager = new ResizeManager()
