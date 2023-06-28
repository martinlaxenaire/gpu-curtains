import { CameraBasePerspectiveOptions } from '../core/camera/Camera'
import { GPUCurtainsRenderer } from './renderer/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { Vec3 } from '../math/Vec3'

interface GPUCurtainsOptions {
  container: HTMLElement
  pixelRatio: number
  sampleCount: number
  camera: CameraBasePerspectiveOptions
  production: boolean
}

interface GPUCurtainsParams extends Partial<GPUCurtainsOptions> {
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

  animate()
  render()

  destroy()
}
