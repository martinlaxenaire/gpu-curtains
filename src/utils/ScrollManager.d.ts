interface ScrollManagerParams {
  xOffset?: number
  yOffset?: number
  lastXDelta?: number
  lastYDelta?: number
  shouldWatch?: boolean
  onScroll?: () => void
}

export class ScrollManager {
  xOffset?: number
  yOffset?: number
  lastXDelta?: number
  lastYDelta?: number
  shouldWatch?: boolean
  onScroll?: (lastXDelta?: number, lastYDelta?: number) => void

  handler: void

  constructor({ xOffset, yOffset, lastXDelta, lastYDelta, shouldWatch, onScroll }: ScrollManagerParams)

  scroll()
  updateScrollValues(x: number, y: number)

  destroy()
}
