interface ResizeManagerEntry {
  element: HTMLElement
  callback: () => void | null
}

export class ResizeManager {
  shouldWatch: boolean
  entries: ResizeManagerEntry[]
  resizeObserver: ResizeObserver

  useObserver(shouldWatch: boolean)

  observe({ element, callback }: ResizeManagerEntry)
  unobserve(element: HTMLElement)

  destroy()
}

export const resizeManager: ResizeManager
