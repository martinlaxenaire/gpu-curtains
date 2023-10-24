import { Camera, CameraBasePerspectiveOptions } from '../core/camera/Camera'
import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { Vec3 } from '../math/Vec3'
import { PingPongPlane } from './meshes/PingPongPlane'
import { ShaderPass } from '../core/renderPasses/ShaderPass'
import { MeshType, DOMMeshType } from '../core/renderers/GPURenderer'
import { Plane } from './meshes/Plane'
import { DOMElementBoundingRect } from '../core/DOMElement'

interface GPUCurtainsOptions {
  container: HTMLElement
  pixelRatio: number
  sampleCount: number
  preferredFormat?: GPUTextureFormat
  camera: CameraBasePerspectiveOptions
  production: boolean
  autoRender: boolean
  autoResize: boolean
  watchScroll: boolean
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
  _onErrorCallback: () => void
  onRender(callback: () => void): GPUCurtains
  onScroll(callback: () => void): GPUCurtains
  onAfterResize(callback: () => void): GPUCurtains
  onError(callback: () => void): GPUCurtains

  constructor({ container, pixelRatio, camera }: GPUCurtainsParams)

  setContainer(container: string | HTMLElement)
  setRenderer()
  setRendererContext(): Promise<void>
  setCurtains()

  get pingPongPlanes(): PingPongPlane[]
  get shaderPasses(): ShaderPass[]
  get meshes(): MeshType[]
  get domMeshes(): DOMMeshType[]
  get planes(): Plane

  get camera(): Camera | null
  setPerspective(fov?: number, near?: number, far?: number)
  setCameraPosition(position: Vec3)

  initEvents()
  resize()
  get boundingRect(): DOMElementBoundingRect

  initScroll()
  updateScroll(lastXDelta?: number, lastYDelta?: number)
  getScrollDeltas(): { x: number; y: number }
  getScrollValues(): { x: number; y: number }

  animate()
  render()

  destroy()
}
