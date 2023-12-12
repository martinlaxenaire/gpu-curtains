import { DOMElement } from '../core/DOM/DOMElement'

/**
 * Defines a {@link ResizeManager} entry
 */
export interface ResizeManagerEntry {
  /** {@link HTMLElement} to track */
  element: DOMElement['element'] | Element
  /** Function to execute when the [element]{@link ResizeManagerEntry#element} is resized */
  callback: () => void | null
}

/**
 * ResizeManager class:
 * Tiny wrapper around {@link ResizeObserver} used to execute callbacks when given HTMLElement size changes.
 */
export class ResizeManager {
  /** Whether we should add elements to our [ResizeObserver]{@link ResizeManager#resizeObserver} or not */
  shouldWatch: boolean
  /** Array of [entries]{@link ResizeManagerEntry} */
  entries: ResizeManagerEntry[]
  /** {@link ResizeObserver} used */
  resizeObserver: ResizeObserver

  /**
   * ResizeManager constructor
   */
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

  /**
   * Set [shouldWatch]{@link ResizeManager#shouldWatch}
   * @param shouldWatch - whether to watch or not
   */
  useObserver(shouldWatch = true) {
    this.shouldWatch = shouldWatch
  }

  /**
   * Track an [element]{@link HTMLElement} size change and execute a callback function when it happens
   * @param entry - [entry]{@link ResizeManagerEntry} to watch
   */
  observe({ element, callback }: ResizeManagerEntry) {
    if (!element || !this.shouldWatch) return

    this.resizeObserver.observe(element)

    const entry = {
      element,
      callback,
    }

    this.entries.push(entry)
  }

  /**
   * Unobserve an [element]{@link HTMLElement} and remove it from our [entries array]{@link ResizeManager#entries}
   * @param element - [element]{@link HTMLElement} to unobserve
   */
  unobserve(element: DOMElement['element'] | Element) {
    this.resizeObserver.unobserve(element)
    this.entries = this.entries.filter((e) => !e.element.isSameNode(element))
  }

  /**
   * Destroy our {@link ResizeManager}
   */
  destroy() {
    this.resizeObserver.disconnect()
  }
}

/** @exports @const resizeManager - {@link ResizeManager} class object */
export const resizeManager = new ResizeManager() as ResizeManager
