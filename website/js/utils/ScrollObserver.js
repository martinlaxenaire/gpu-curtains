export class ScrollObserver {
  constructor() {
    const observerSteps = 20
    this.observer = new IntersectionObserver(this.intersectionObserverCallback.bind(this), {
      threshold: Array.from(Array(observerSteps + 1), (e, i) => i / observerSteps),
    })

    this.observedEls = []
  }

  intersectionObserverCallback(entries) {
    entries.forEach((entry) => {
      const observedEl = this.observedEls.length && this.observedEls.find((e) => e.element.isSameNode(entry.target))

      if (observedEl) {
        if (!observedEl.inView && entry.intersectionRatio > observedEl.visibleRatio) {
          observedEl.inView = true
          observedEl.onElVisible()

          if (!observedEl.keepObserving) {
            this.unobserve(observedEl)
          }
        } else if (observedEl.inView && entry.intersectionRatio <= observedEl.hiddenRatio) {
          observedEl.inView = false
          observedEl.onElHidden()
        }
      }
    })
  }

  observe({
    element,
    visibleRatio = 0.15,
    hiddenRatio = 0,
    keepObserving = false,
    onElVisible = () => {
      /* allow empty callbacks */
    },
    onElHidden = () => {
      /* allow empty callbacks */
    },
  }) {
    this.observedEls.push({
      element,
      visibleRatio,
      hiddenRatio,
      keepObserving,
      onElVisible,
      onElHidden,
      inView: false,
    })

    this.observer.observe(element)
  }

  unobserve(observedEl) {
    this.observer.unobserve(observedEl.element)

    // remove element from our els array
    this.observedEls = this.observedEls.filter((e) => !e.element.isSameNode(observedEl.element))
  }
}
