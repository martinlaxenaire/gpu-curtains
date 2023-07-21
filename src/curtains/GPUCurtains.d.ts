import { CameraBasePerspectiveOptions } from '../core/camera/Camera'
import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { Vec3 } from '../math/Vec3'

interface GPUCurtainsOptions {
  container: HTMLElement
  pixelRatio: number
  sampleCount: number
  preferredFormat?: GPUTextureFormat
  camera: CameraBasePerspectiveOptions
  production: boolean
}

interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
  container?: string | HTMLElement | null
}

export class GPUCurtains {
  type: string
  options: GPUCurtainsOptions
  container: HTMLElement

  renderer: GPUCurtainsRenderer
  canvas: GPUCurtainsRenderer['canvas']

  scrollManager: ScrollManager

  animationFrameID: null | number

  _onRenderCallback: () => void
  _onScrollCallback: () => void
  _onAfterResizeCallback: () => void
  onRender(callback: () => void): GPUCurtains
  onScroll(callback: () => void): GPUCurtains
  onAfterResize(callback: () => void): GPUCurtains

  constructor({ container, pixelRatio, camera }: GPUCurtainsParams)

  setContainer(container: string | HTMLElement)
  setRenderer()
  setRendererContext(): Promise<void>
  setCurtains()

  setPerspective(fov?: number, near?: number, far?: number)
  setCameraPosition(position: Vec3)

  initEvents()
  resize()

  initScroll()
  updateScroll(lastXDelta?: number, lastYDelta?: number)
  getScrollDeltas(): { x: number; y: number }
  getScrollValues(): { x: number; y: number }

  animate()
  render()

  destroy()
}
