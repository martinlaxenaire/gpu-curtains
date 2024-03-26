import { DOMElement } from '../core/DOM/DOMElement'

/**
 * Defines a {@link ResizeManager} entry
 */
export interface ResizeManagerEntry {
  /** {@link HTMLElement} to track */
  element: DOMElement['element'] | Element
  /** Priority in which to call the callback function */
  priority?: number
  /** Function to execute when the {@link element} is resized */
  callback: () => void | null
}

/**
 * Tiny wrapper around {@link ResizeObserver} used to execute callbacks when given {@link HTMLElement} size changes.
 */
export class ResizeManager {
  /** Whether we should add elements to our {@link resizeObserver} or not */
  shouldWatch: boolean
  /** Array of {@link ResizeManagerEntry | entries} */
  entries: ResizeManagerEntry[]
  /** {@link ResizeObserver} used */
  resizeObserver: ResizeObserver | undefined

  /**
   * ResizeManager constructor
   */
  constructor() {
    // default to true
    this.shouldWatch = true

    this.entries = []

    // do not throw an error if we're using the lib inside a worker
    if (typeof window === 'object' && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((observedEntries) => {
        // get all entries corresponding to that element, and sort them by priority
        const allEntries = observedEntries
          .map((observedEntry) => {
            return this.entries.filter((e) => e.element.isSameNode(observedEntry.target))
          })
          .flat()
          .sort((a, b) => b.priority - a.priority)

        allEntries?.forEach((entry) => {
          if (entry && entry.callback) {
            entry.callback()
          }
        })
      })
    }
  }

  /**
   * Set {@link shouldWatch}
   * @param shouldWatch - whether to watch or not
   */
  useObserver(shouldWatch = true) {
    this.shouldWatch = shouldWatch
  }

  /**
   * Track an {@link HTMLElement} size change and execute a callback function when it happens
   * @param entry - {@link ResizeManagerEntry | entry} to watch
   */
  observe({ element, priority, callback }: ResizeManagerEntry) {
    if (!element || !this.shouldWatch) return

    this.resizeObserver?.observe(element)

    const entry = {
      element,
      priority,
      callback,
    }

    this.entries.push(entry)
  }

  /**
   * Unobserve an {@link HTMLElement} and remove it from our {@link entries} array
   * @param element - {@link HTMLElement} to unobserve
   */
  unobserve(element: DOMElement['element'] | Element) {
    this.resizeObserver?.unobserve(element)
    this.entries = this.entries.filter((e) => !e.element.isSameNode(element))
  }

  /**
   * Destroy our {@link ResizeManager}
   */
  destroy() {
    this.resizeObserver?.disconnect()
  }
}

/** @exports @const resizeManager - {@link ResizeManager} class object */
export const resizeManager = new ResizeManager() as ResizeManager
