import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement, DOMElementBoundingRect, RectBBox, RectSize } from '../DOM/DOMElement'
import { Scene } from '../scenes/Scene'
import { RenderPass, RenderPassParams } from '../renderPasses/RenderPass'
import { generateUUID, throwError, throwWarning } from '../../utils/utils'

import { ComputePass } from '../computePasses/ComputePass'
import { PingPongPlane } from '../../extras/meshes/PingPongPlane'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { DOMTexture } from '../textures/DOMTexture'
import { Sampler } from '../samplers/Sampler'

import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { Plane } from '../../curtains/meshes/Plane'
import { Mesh } from '../meshes/Mesh'
import { TasksQueueManager } from '../../utils/TasksQueueManager'
import { AllowedBindGroups } from '../../types/BindGroups'
import { Texture } from '../textures/Texture'
import { GPUDeviceManager } from './GPUDeviceManager'
import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { Buffer } from '../buffers/Buffer'
import { RenderBundle } from '../renderPasses/RenderBundle'
import { IndirectBuffer } from '../../extras/buffers/IndirectBuffer'

/** Options used to configure the renderer canvas context. If not specified, `format` will be set with `GPU.getPreferredCanvasFormat()` and `alphaMode` with `premultiplied`. */
export interface GPURendererContextOptions extends Omit<GPUCanvasConfiguration, 'device' | 'usage'> {}

/** Parameters used to configure the renderer canvas context. */
export interface GPURendererContextParams extends Partial<GPURendererContextOptions> {}

/**
 * Parameters used to create a {@link GPURenderer}.
 */
export interface GPURendererParams {
  /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
  deviceManager: GPUDeviceManager

  /** Optional label of this {@link GPURenderer} */
  label?: string
  /** {@link HTMLElement} or selector used as a container for our {@link GPURenderer#canvas | canvas}. Could also be directly a {@link HTMLCanvasElement | canvas element}. */
  container: string | HTMLElement
  /** Pixel ratio to use for rendering */
  pixelRatio?: number

  /** Whether to auto resize the renderer each time its {@link GPURenderer#domElement} size changes or not. It is advised to set this parameter to `false` if the provided {@link container} is a {@link HTMLCanvasElement | canvas element}, and handle {@link GPURenderer#resize | resizing} by yourself. */
  autoResize?: boolean

  /** Options used to configure this {@link GPURenderer} context. If not specified, `format` will be set with `GPU.getPreferredCanvasFormat()` and `alphaMode` with `premultiplied`. */
  context?: GPURendererContextParams

  /** The {@link GPURenderer#renderPass | renderer RenderPass} parameters */
  renderPass?: {
    /** Whether the {@link GPURenderer#renderPass | renderer RenderPass} should handle depth. Default to `true` */
    useDepth: RenderPassParams['useDepth']
    /** The {@link GPURenderer#renderPass | renderer RenderPass} sample count (i.e. whether it should use multisampled antialiasing). Default to `4` */
    sampleCount: RenderPassParams['sampleCount']
    /** The {@link GPUCommandEncoder.beginRenderPass().clearValue | color values} to clear to before drawing the {@link GPURenderer#renderPass | renderer RenderPass}. Default to `[0, 0, 0, 0]` */
    clearValue: GPUColor
  }
}

/** Options used to create this {@link GPURenderer}. */
export interface GPURendererOptions extends GPURendererParams {
  /** Patched {@link GPURendererContextOptions | context configuration options}. */
  context: GPURendererContextOptions
}

/** Any Mesh that is bound to a DOM Element */
export type DOMProjectedMesh = DOMMesh | Plane
/** Any Mesh that is projected (i.e use a {@link core/camera/Camera.Camera | Camera} to compute a model view projection matrix) */
export type ProjectedMesh = Mesh | DOMProjectedMesh
/** Any Mesh that can be drawn (including fullscreen quad meshes) and that will be put in the {@link Scene} meshes stacks */
export type SceneStackedMesh = ProjectedMesh | FullscreenPlane
/** Anything that can be added to a {@link Scene} meshes stacks, including {@link RenderBundle} */
export type SceneStackedObject = SceneStackedMesh | RenderBundle
/** Any Mesh that is drawn fullscren, i.e. fullscreen quad meshes used for post processing and {@link PingPongPlane} */
export type FullscreenPass = PingPongPlane | ShaderPass
/** Any Mesh that can be drawn, including fullscreen quad meshes used for post processing and {@link PingPongPlane} */
export type RenderedMesh = SceneStackedMesh | FullscreenPass
/** Any Mesh or Compute pass */
export type SceneObject = RenderedMesh | ComputePass

/**
 * Base renderer class, that could technically be used to render compute passes and draw fullscreen quads, even tho it is strongly advised to use at least the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} class instead.
 * A renderer is responsible for:
 * - Setting a {@link GPUCanvasContext | context}
 * - Handling the {@link HTMLCanvasElement | canvas} onto everything is drawn
 * - Creating a {@link RenderPass} that will handle our render and depth textures and the render pass descriptor
 * - Keeping track of every specific class objects created relative to computing and rendering
 * - Creating a {@link Scene} class that will take care of the rendering process of all previously mentioned objects
 */
export class GPURenderer {
  /** The type of the {@link GPURenderer} */
  type: string
  /** The universal unique id of this {@link GPURenderer} */
  readonly uuid: string

  /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
  deviceManager: GPUDeviceManager

  /** {@link HTMLCanvasElement} onto everything is drawn */
  canvas: HTMLCanvasElement
  /** The WebGPU {@link GPUCanvasContext | context} used */
  context: null | GPUCanvasContext
  /** Set the {@link GPUCanvasContext | context} alpha mode */
  //alphaMode?: GPUCanvasAlphaMode

  /** Options used to create this {@link GPURenderer} */
  options: GPURendererOptions

  /** The {@link RenderPass | render pass} used to render our result to screen */
  renderPass: RenderPass
  /** Additional {@link RenderPass | render pass} used by {@link ShaderPass} for compositing / post processing. Does not handle depth */
  postProcessingPass: RenderPass

  /** The {@link Scene} used */
  scene: Scene

  /** Whether we should render our {@link GPURenderer} or not. If set to `false`, the render hooks {@link onBeforeCommandEncoderCreation}, {@link onBeforeRenderScene}, {@link onAfterRenderScene} and {@link onAfterCommandEncoderSubmission} won't be called, the scene graph will not be updated and the scene will not be rendered, completely pausing the renderer. Default to `true`. */
  shouldRender: boolean

  /** Whether we should explicitly update our {@link Scene} or not. If set to `false`, the scene graph will not be updated and the scene will not be rendered. Default to `true`. */
  shouldRenderScene: boolean

  /** An array containing all our created {@link ComputePass} */
  computePasses: ComputePass[]
  /** An array containing all our created {@link PingPongPlane} */
  pingPongPlanes: PingPongPlane[]
  /** An array containing all our created {@link ShaderPass} */
  shaderPasses: ShaderPass[]
  /** An array containing all our created {@link RenderTarget} */
  renderTargets: RenderTarget[]
  /** An array containing all our created {@link SceneStackedMesh | meshes} */
  meshes: SceneStackedMesh[]
  /** An array containing all our created {@link Texture} */
  textures: Texture[]
  /** An {@link Map} containing all our created {@link RenderBundle} */
  renderBundles: Map<RenderBundle['uuid'], RenderBundle>
  /** A {@link Map} containing all our create {@link IndirectBuffer} */
  indirectBuffers: Map<IndirectBuffer['uuid'], IndirectBuffer>

  /** Pixel ratio to use for rendering */
  pixelRatio: number
  /** An object defining the width, height, top and left position of the canvas. Mainly used internally. If you need to get the renderer dimensions, use {@link boundingRect} instead. */
  rectBBox: RectBBox

  /** {@link DOMElement} that will track our canvas container size */
  domElement: DOMElement | undefined

  /** Allow to add callbacks to be executed at each render before the {@link GPUCommandEncoder} is created */
  onBeforeCommandEncoderCreation: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created but before the {@link Scene} is rendered */
  onBeforeRenderScene: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created and after the {@link Scene} has been rendered */
  onAfterRenderScene: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link Scene} has been rendered and the {@link GPUCommandEncoder} has been submitted */
  onAfterCommandEncoderSubmission: TasksQueueManager

  // callbacks / events
  /** function assigned to the {@link onBeforeRender} callback */
  _onBeforeRenderCallback = (commandEncoder: GPUCommandEncoder) => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterRender} callback */
  _onAfterRenderCallback = (commandEncoder: GPUCommandEncoder) => {
    /* allow empty callback */
  }
  /** function assigned to the {@link resizeObjects} callback */
  _onResizeCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterResize} callback */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * GPURenderer constructor
   * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}
   */
  constructor({
    deviceManager,
    label,
    container,
    pixelRatio = 1,
    autoResize = true,
    context = {},
    renderPass,
  }: GPURendererParams) {
    this.type = 'GPURenderer'
    this.uuid = generateUUID()

    if (!deviceManager || deviceManager.constructor.name !== 'GPUDeviceManager') {
      throwError(
        label
          ? `${label} (${this.type}): no device manager or wrong device manager provided: ${deviceManager}`
          : `${this.type}: no device manager or wrong device manager provided: ${deviceManager}`
      )
    }

    if (!label) {
      label = `${this.constructor.name}${deviceManager.renderers.length}`
    }

    this.deviceManager = deviceManager
    this.deviceManager.addRenderer(this)

    this.shouldRender = true
    this.shouldRenderScene = true

    // context configuration default values
    const contextOptions = {
      ...{
        alphaMode: 'premultiplied' as GPUCanvasAlphaMode,
        format: this.deviceManager.gpu?.getPreferredCanvasFormat(),
      },
      ...context,
    }

    // render pass default values
    renderPass = { ...{ useDepth: true, sampleCount: 4, clearValue: [0, 0, 0, 0] }, ...renderPass }

    this.options = {
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      context: contextOptions,
      renderPass,
    }

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1

    // create the canvas
    const isOffscreenCanvas = container instanceof OffscreenCanvas
    const isContainerCanvas = isOffscreenCanvas || container instanceof HTMLCanvasElement
    this.canvas = isContainerCanvas ? (container as HTMLCanvasElement) : document.createElement('canvas')

    // set default size
    const { width, height } = this.canvas
    this.rectBBox = {
      width,
      height,
      top: 0,
      left: 0,
    }

    this.setScene()
    this.setTasksQueues()
    this.setRendererObjects()

    if (!isOffscreenCanvas) {
      // needed to get container bounding box
      this.domElement = new DOMElement({
        element: container,
        priority: 5, // renderer callback need to be called first
        onSizeChanged: () => {
          if (this.options.autoResize) this.resize()
        },
      })

      // now that we have a domElement, resize right away
      this.resize()

      if (!isContainerCanvas) {
        // append the canvas
        this.domElement.element.appendChild(this.canvas)
      }
    }

    // device is already available? create the context!
    if (this.deviceManager.device) {
      this.setContext()
    }
  }

  /**
   * Set the renderer {@link RectBBox} and canvas sizes
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  setSize(rectBBox: Partial<RectBBox> | null = null) {
    // patch rect bbox with missing values from bounding rect if needed
    rectBBox = {
      ...{
        width: Math.max(1, this.boundingRect.width),
        height: Math.max(1, this.boundingRect.height),
        top: this.boundingRect.top,
        left: this.boundingRect.left,
      },
      ...rectBBox,
    }

    this.rectBBox = rectBBox as RectBBox

    const renderingSize = {
      width: this.rectBBox.width,
      height: this.rectBBox.height,
    }

    renderingSize.width *= this.pixelRatio
    renderingSize.height *= this.pixelRatio

    this.clampToMaxDimension(renderingSize)

    // canvas rendering size
    this.canvas.width = Math.floor(renderingSize.width)
    this.canvas.height = Math.floor(renderingSize.height)

    // canvas display size
    if (this.canvas.style) {
      this.canvas.style.width = this.rectBBox.width + 'px'
      this.canvas.style.height = this.rectBBox.height + 'px'
    }
  }

  /**
   * Set the renderer {@link GPURenderer.pixelRatio | pixel ratio} and {@link resize} it
   * @param pixelRatio - new pixel ratio to use
   */
  setPixelRatio(pixelRatio: number = 1) {
    this.pixelRatio = pixelRatio
    this.resize(this.rectBBox)
  }

  /**
   * Resize our {@link GPURenderer}
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox: RectBBox | null = null) {
    this.setSize(rectBBox)

    this._onResizeCallback && this._onResizeCallback()

    this.resizeObjects()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /**
   * Resize all tracked objects ({@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes).
   */
  resizeObjects() {
    // resize textures first
    this.textures.forEach((texture) => {
      texture.resize()
    })

    // resize render & shader passes
    this.renderPass?.resize()
    this.postProcessingPass?.resize()

    this.renderTargets.forEach((renderTarget) => renderTarget.resize())

    // force compute passes onAfterResize callback
    this.computePasses.forEach((computePass) => computePass.resize())

    // now resize meshes that are bound to the renderer size
    // especially useful to resize textures
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect))
    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect))
    this.resizeMeshes()
  }

  /**
   * Resize the {@link meshes}.
   */
  resizeMeshes() {
    this.meshes.forEach((mesh) => {
      mesh.resize(this.boundingRect)
    })
  }

  /**
   * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}. If there's no {@link domElement | DOM Element} (like when using an offscreen canvas for example), the {@link rectBBox} values are used.
   */
  get boundingRect(): DOMElementBoundingRect {
    if (!!this.domElement && !!this.domElement.boundingRect) {
      return this.domElement.boundingRect
    } else if (!!this.domElement) {
      const boundingRect = this.domElement.element?.getBoundingClientRect()
      return {
        top: boundingRect.top,
        right: boundingRect.right,
        bottom: boundingRect.bottom,
        left: boundingRect.left,
        width: boundingRect.width,
        height: boundingRect.height,
        x: boundingRect.x,
        y: boundingRect.y,
      }
    } else {
      return {
        top: this.rectBBox.top,
        right: this.rectBBox.left + this.rectBBox.width,
        bottom: this.rectBBox.top + this.rectBBox.height,
        left: this.rectBBox.left,
        width: this.rectBBox.width,
        height: this.rectBBox.height,
        x: this.rectBBox.left,
        y: this.rectBBox.top,
      }
    }
  }

  /**
   * Clamp to max WebGPU texture dimensions
   * @param dimension - width and height dimensions to clamp
   */
  clampToMaxDimension(dimension: RectSize | DOMElementBoundingRect) {
    if (this.device) {
      dimension.width = Math.min(this.device.limits.maxTextureDimension2D, dimension.width)
      dimension.height = Math.min(this.device.limits.maxTextureDimension2D, dimension.height)
    }
  }

  /* USEFUL DEVICE MANAGER OBJECTS */

  /**
   * Get our {@link GPUDeviceManager#device | device}
   * @readonly
   */
  get device(): GPUDevice | undefined {
    return this.deviceManager.device
  }

  /**
   * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set
   * @readonly
   */
  get ready(): boolean {
    return this.deviceManager.ready && !!this.context && !!this.canvas.width && !!this.canvas.height
  }

  /**
   * Get our {@link GPUDeviceManager#production | GPUDeviceManager production flag}
   * @readonly
   */
  get production(): boolean {
    return this.deviceManager.production
  }

  /**
   * Get all the created {@link GPUDeviceManager#samplers | samplers}
   * @readonly
   */
  get samplers(): Sampler[] {
    return this.deviceManager.samplers
  }

  /**
   * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}
   * @readonly
   */
  get buffers(): Map<string, Buffer> {
    return this.deviceManager.buffers
  }

  /**
   * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}
   * @readonly
   */
  get pipelineManager(): PipelineManager {
    return this.deviceManager.pipelineManager
  }

  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}
   * @readonly
   */
  get deviceRenderedObjects(): SceneObject[] {
    return this.deviceManager.deviceRenderedObjects
  }

  /**
   * Configure our {@link context} with the given options
   */
  configureContext() {
    this.context.configure({
      device: this.device,
      ...this.options.context,
      // needed so we can copy textures for post processing usage
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      //viewFormats: []
    })
  }

  /**
   * Set our {@link context} if possible and set {@link renderPass | main render pass} and {@link scene}
   */
  setContext() {
    this.context = this.canvas.getContext('webgpu')

    if (this.device) {
      this.configureContext()

      this.setMainRenderPasses()
    }
  }

  /**
   * Called when the {@link GPUDeviceManager#device | device} is lost.
   * Force all our scene objects to lose context.
   */
  loseContext() {
    // force all our scene objects to lose context
    this.renderBundles.forEach((bundle) => bundle.loseContext())
    this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext())
  }

  /**
   * Called when the {@link GPUDeviceManager#device | device} should be restored.
   * Configure the context again, resize the {@link RenderTarget | render targets} and {@link Texture | textures}, restore our {@link renderedObjects | rendered objects} context.
   */
  restoreContext() {
    this.configureContext()

    // recreate indirect buffers
    this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.create())

    // recreate all textures first
    this.textures.forEach((texture) => {
      texture.createTexture()
    })

    // resize render passes/recreate their textures
    this.renderPass?.resize()
    this.postProcessingPass?.resize()

    this.renderTargets.forEach((renderTarget) => renderTarget.resize())

    // restore context of all our scene objects
    this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext())
  }

  /* PIPELINES, SCENE & MAIN RENDER PASS */

  /**
   * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen and our {@link postProcessingPass | postprocessing pass} that will be used for any additional postprocessing render passes.
   */
  setMainRenderPasses() {
    this.renderPass = new RenderPass(this, {
      label: this.options.label + ' render pass',
      ...this.options.renderPass,
    } as RenderPassParams)

    // add to the scene stack
    this.scene.setMainRenderPassEntry()

    this.postProcessingPass = new RenderPass(this, {
      label: this.options.label + ' post processing render pass',
      // no need to handle depth or perform MSAA on a fullscreen quad
      useDepth: false,
      sampleCount: 1,
    })
  }

  /**
   * Set our {@link scene}
   */
  setScene() {
    this.scene = new Scene({ renderer: this })
  }

  /* BUFFERS & BINDINGS */

  /**
   * Create a {@link !GPUBuffer}
   * @param buffer - {@link Buffer} to use for buffer creation
   * @returns - newly created {@link !GPUBuffer}
   */
  createBuffer(buffer: Buffer): GPUBuffer {
    const GPUBuffer = this.deviceManager.device?.createBuffer(buffer.options)
    this.deviceManager.addBuffer(buffer)
    return GPUBuffer
  }

  /**
   * Remove a {@link Buffer} from our {@link GPUDeviceManager#buffers | buffers Map}
   * @param buffer - {@link Buffer} to remove
   */
  removeBuffer(buffer: Buffer) {
    this.deviceManager.removeBuffer(buffer)
  }

  /**
   * Write to a {@link GPUBuffer}
   * @param buffer - {@link GPUBuffer} to write to
   * @param bufferOffset - {@link GPUQueue.writeBuffer().bufferOffset | buffer offset}
   * @param data - {@link GPUQueue.writeBuffer().data | data} to write
   */
  queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource) {
    this.deviceManager.device?.queue.writeBuffer(buffer, bufferOffset, data)
  }

  /**
   * Copy a source {@link Buffer#GPUBuffer | Buffer GPUBuffer} into a destination {@link Buffer#GPUBuffer | Buffer GPUBuffer}
   * @param parameters - parameters used to realize the copy
   * @param parameters.srcBuffer - source {@link Buffer}
   * @param [parameters.dstBuffer] - destination {@link Buffer}. Will create a new one if none provided.
   * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
   * @returns - destination {@link Buffer} after copy
   */
  copyBufferToBuffer({
    srcBuffer,
    dstBuffer,
    commandEncoder,
  }: {
    srcBuffer: Buffer
    dstBuffer?: Buffer
    commandEncoder?: GPUCommandEncoder
  }): Buffer | null {
    if (!srcBuffer || !srcBuffer.GPUBuffer) {
      throwWarning(
        `${this.options.label} (${this.type}): cannot copy to buffer because the source buffer has not been provided`
      )
      return null
    }

    if (!dstBuffer) {
      dstBuffer = new Buffer()
    }

    if (!dstBuffer.GPUBuffer) {
      dstBuffer.createBuffer(this, {
        label: `GPURenderer (${this.options.label}): destination copy buffer from: ${srcBuffer.options.label}`,
        size: srcBuffer.GPUBuffer.size,
        //usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        usage: ['copyDst', 'mapRead'],
      })
    }

    if (srcBuffer.GPUBuffer.mapState !== 'unmapped') {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot copy from ${srcBuffer.GPUBuffer} because it is currently mapped`
      )
      return
    }
    if (dstBuffer.GPUBuffer.mapState !== 'unmapped') {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot copy from ${dstBuffer.GPUBuffer} because it is currently mapped`
      )
      return
    }

    // if there's no command encoder provided, we'll have to create one and submit it after the copy process
    const hasCommandEncoder = !!commandEncoder

    if (!hasCommandEncoder) {
      commandEncoder = this.deviceManager.device?.createCommandEncoder({
        label: `${this.type} (${this.options.label}): Copy buffer command encoder`,
      })
      !this.production &&
        commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Copy buffer command encoder`)
    }

    commandEncoder.copyBufferToBuffer(srcBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer.size)

    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup()
      const commandBuffer = commandEncoder.finish()
      this.deviceManager.device?.queue.submit([commandBuffer])
    }

    return dstBuffer
  }

  /* BIND GROUPS & LAYOUTS */

  /**
   * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}
   * @readonly
   */
  get bindGroups(): Map<string, AllowedBindGroups> {
    return this.deviceManager.bindGroups
  }

  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to add
   */
  addBindGroup(bindGroup: AllowedBindGroups) {
    this.deviceManager.addBindGroup(bindGroup)
  }

  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
   */
  removeBindGroup(bindGroup: AllowedBindGroups) {
    this.deviceManager.removeBindGroup(bindGroup)
  }

  /**
   * Create a {@link GPUBindGroupLayout}
   * @param bindGroupLayoutDescriptor - {@link GPUDevice.createBindGroupLayout().descriptor | GPUBindGroupLayoutDescriptor}
   * @returns - newly created {@link GPUBindGroupLayout}
   */
  createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    return this.deviceManager.device?.createBindGroupLayout(bindGroupLayoutDescriptor)
  }

  /**
   * Create a {@link GPUBindGroup}
   * @param bindGroupDescriptor - {@link GPUDevice.createBindGroup().descriptor | GPUBindGroupDescriptor}
   * @returns - newly created {@link GPUBindGroup}
   */
  createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup {
    return this.deviceManager.device?.createBindGroup(bindGroupDescriptor)
  }

  /* SHADERS & PIPELINES */

  /**
   * Create a {@link GPUShaderModule}
   * @param shaderModuleDescriptor - {@link GPUDevice.createShaderModule().descriptor | GPUShaderModuleDescriptor}
   * @returns - newly created {@link GPUShaderModule}
   */
  createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule {
    return this.device?.createShaderModule(shaderModuleDescriptor)
  }

  /**
   * Create a {@link GPUPipelineLayout}
   * @param pipelineLayoutDescriptor - {@link GPUDevice.createPipelineLayout().descriptor | GPUPipelineLayoutDescriptor}
   * @returns - newly created {@link GPUPipelineLayout}
   */
  createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout {
    return this.device?.createPipelineLayout(pipelineLayoutDescriptor)
  }

  /**
   * Create a {@link GPURenderPipeline}
   * @param pipelineDescriptor - {@link GPUDevice.createRenderPipeline().descriptor | GPURenderPipelineDescriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    return this.device?.createRenderPipeline(pipelineDescriptor)
  }

  /**
   * Asynchronously create a {@link GPURenderPipeline}
   * @param pipelineDescriptor - {@link GPUDevice.createRenderPipeline().descriptor | GPURenderPipelineDescriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  async createRenderPipelineAsync(pipelineDescriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline> {
    return await this.device?.createRenderPipelineAsync(pipelineDescriptor)
  }

  /**
   * Create a {@link GPUComputePipeline}
   * @param pipelineDescriptor - {@link GPUDevice.createComputePipeline().descriptor | GPUComputePipelineDescriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline {
    return this.device?.createComputePipeline(pipelineDescriptor)
  }

  /**
   * Asynchronously create a {@link GPUComputePipeline}
   * @param pipelineDescriptor - {@link GPUDevice.createComputePipeline().descriptor | GPUComputePipelineDescriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  async createComputePipelineAsync(pipelineDescriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline> {
    return await this.device?.createComputePipelineAsync(pipelineDescriptor)
  }

  /* TEXTURES */

  /**
   * Get all created {@link DOMTexture} tracked by our {@link GPUDeviceManager}
   * @readonly
   */
  get domTextures(): DOMTexture[] {
    return this.deviceManager.domTextures
  }

  /**
   * Add a {@link DOMTexture} to our {@link GPUDeviceManager#domTextures | textures array}
   * @param texture - {@link DOMTexture} to add
   */
  addDOMTexture(texture: DOMTexture) {
    this.deviceManager.addDOMTexture(texture)
  }

  /**
   * Remove a {@link DOMTexture} from our {@link GPUDeviceManager#domTextures | textures array}
   * @param texture - {@link DOMTexture} to remove
   */
  removeDOMTexture(texture: DOMTexture) {
    this.deviceManager.removeDOMTexture(texture)
  }

  /**
   * Add a {@link Texture} to our {@link textures} array
   * @param texture - {@link Texture} to add
   */
  addTexture(texture: Texture) {
    this.textures.push(texture)
  }

  /**
   * Remove a {@link Texture} from our {@link textures} array
   * @param texture - {@link Texture} to remove
   */
  removeTexture(texture: Texture) {
    this.textures = this.textures.filter((t) => t.uuid !== texture.uuid)
  }

  /**
   * Create a {@link GPUTexture}
   * @param textureDescriptor - {@link GPUDevice.createTexture().descriptor | GPUTextureDescriptor}
   * @returns - newly created {@link GPUTexture}
   */
  createTexture(textureDescriptor: GPUTextureDescriptor): GPUTexture {
    return this.deviceManager.device?.createTexture(textureDescriptor)
  }

  /**
   * Upload a {@linkDOMTexture#texture | texture} to the GPU
   * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
   */
  uploadTexture(texture: DOMTexture) {
    this.deviceManager.uploadTexture(texture)
  }

  /**
   * Import a {@link GPUExternalTexture}
   * @param video - {@link HTMLVideoElement} source
   * @returns - {@link GPUExternalTexture}
   */
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture {
    // TODO WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    // see onVideoFrameCallback method in DOMTexture class
    // const videoFrame = new VideoFrame(video)
    // return this.deviceManager.device?.importExternalTexture({ source: videoFrame })
    return this.deviceManager.device?.importExternalTexture({ source: video })
  }

  /**
   * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
   * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
   * @param sampler - {@link Sampler} to create
   * @returns - the {@link GPUSampler}
   */
  createSampler(sampler: Sampler): GPUSampler {
    const existingSampler = this.samplers.find((existingSampler) => {
      return JSON.stringify(existingSampler.options) === JSON.stringify(sampler.options) && existingSampler.sampler
    })

    if (existingSampler) {
      return existingSampler.sampler
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, ...samplerOptions } = sampler.options
      const gpuSampler: GPUSampler = this.deviceManager.device?.createSampler({
        label: sampler.label,
        ...samplerOptions,
      })

      this.deviceManager.addSampler(sampler)

      return gpuSampler
    }
  }

  /**
   * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}
   * @param sampler - {@link Sampler} to remove
   */
  removeSampler(sampler: Sampler) {
    this.deviceManager.removeSampler(sampler)
  }

  /* OBJECTS & TASKS */

  /**
   * Set different tasks queue managers to execute callbacks at different phases of our render call:
   * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder
   * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}
   * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}
   * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder
   */
  setTasksQueues() {
    this.onBeforeCommandEncoderCreation = new TasksQueueManager()
    this.onBeforeRenderScene = new TasksQueueManager()
    this.onAfterRenderScene = new TasksQueueManager()
    this.onAfterCommandEncoderSubmission = new TasksQueueManager()
  }

  /**
   * Set all objects arrays that we'll keep track of
   */
  setRendererObjects() {
    // keep track of compute passes, meshes, etc.
    this.computePasses = []
    this.pingPongPlanes = []
    this.shaderPasses = []
    this.renderTargets = []
    this.meshes = []
    this.textures = []
    this.renderBundles = new Map()
    this.indirectBuffers = new Map()
  }

  /**
   * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
   * @readonly
   */
  get renderedObjects(): SceneObject[] {
    return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes]
  }

  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
   * Useful (but slow) to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to check
   */
  getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[] {
    return this.deviceRenderedObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups,
      ].some((bG) => bG.uuid === bindGroup.uuid)
    })
  }

  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link DOMTexture} or {@link Texture}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param texture - {@link DOMTexture} or {@link Texture} to check
   */
  getObjectsByTexture(texture: DOMTexture | Texture): undefined | SceneObject[] {
    return this.deviceRenderedObjects.filter((object) => {
      return [...object.material.domTextures, ...object.material.textures].some((t) => t.uuid === texture.uuid)
    })
  }

  /* EVENTS */

  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param callback - callback to run just before the {@link render} method will be executed
   * @returns - our {@link GPURenderer}
   */
  onBeforeRender(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onAfterRenderCallback
   * @param callback - callback to run just after the {@link render} method has been executed
   * @returns - our {@link GPURenderer}
   */
  onAfterRender(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /**
   * Callback to run after the {@link GPURenderer} has been resized but before the {@link resizeObjects} method has been executed (before the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes are resized).
   * @param callback - callback to execute.
   * @returns - our {@link GPURenderer}
   */
  onResize(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onResizeCallback = callback
    }

    return this
  }

  /**
   * Callback to run after the {@link GPURenderer} has been resized and after the {@link resizeObjects} method has been executed (after the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes have been resized).
   * @param callback - callback to execute.
   * @returns - our {@link GPURenderer}
   */
  onAfterResize(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /* RENDER */

  /**
   * Render a single {@link ComputePass}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param computePass - {@link ComputePass}
   */
  renderSingleComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass) {
    const pass = commandEncoder.beginComputePass()
    computePass.render(pass)
    pass.end()

    computePass.copyBufferToResult(commandEncoder)
  }

  /**
   * Render a single {@link RenderedMesh | Mesh}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param mesh - {@link RenderedMesh | Mesh} to render
   */
  renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: RenderedMesh) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor)
    mesh.render(pass)
    pass.end()
  }

  /**
   * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}
   * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render
   */
  renderOnce(objects: SceneObject[]) {
    const commandEncoder = this.device?.createCommandEncoder({
      label: 'Render once command encoder',
    })
    !this.production && commandEncoder.pushDebugGroup('Render once command encoder')

    this.pipelineManager.resetCurrentPipeline()

    objects.forEach((object) => {
      if (object.type === 'ComputePass') {
        this.renderSingleComputePass(commandEncoder, object as ComputePass)
      } else {
        this.renderSingleMesh(commandEncoder, object as RenderedMesh)
      }
    })

    !this.production && commandEncoder.popDebugGroup()
    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    this.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
   * @param commandEncoder
   */
  forceClear(commandEncoder?: GPUCommandEncoder) {
    // if there's no command encoder provided, we'll have to create one and submit it after the copy process
    const hasCommandEncoder = !!commandEncoder

    if (!hasCommandEncoder) {
      commandEncoder = this.device?.createCommandEncoder({
        label: `${this.type} (${this.options.label}): Force clear command encoder`,
      })
      !this.production &&
        commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Force clear command encoder`)
    }

    this.renderPass.updateView()
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor)
    pass.end()

    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup()
      const commandBuffer = commandEncoder.finish()
      this.device?.queue.submit([commandBuffer])
    }
  }

  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created. Used to update the {@link Scene} matrix stack.
   */
  onBeforeCommandEncoder() {
    if (!this.ready) return
    if (this.shouldRenderScene) this.scene?.onBeforeRender()
    this.onBeforeCommandEncoderCreation.execute()
  }

  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
   */
  onAfterCommandEncoder() {
    if (!this.ready) return

    this.onAfterCommandEncoderSubmission.execute()
  }

  /**
   * Called at each draw call to render our scene and its content
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.ready || !this.shouldRender) return

    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder)
    this.onBeforeRenderScene.execute(commandEncoder)

    if (this.shouldRenderScene) this.scene?.render(commandEncoder)

    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder)
    this.onAfterRenderScene.execute(commandEncoder)
  }

  /**
   * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
   */
  destroy() {
    this.deviceManager.renderers = this.deviceManager.renderers.filter((renderer) => renderer.uuid !== this.uuid)

    this.domElement?.destroy()

    // remove/destroy render bundles
    this.renderBundles.forEach((bundle) => bundle.destroy())

    // destroy render passes
    this.renderPass?.destroy()
    this.postProcessingPass?.destroy()

    this.renderTargets.forEach((renderTarget) => renderTarget.destroy())
    this.renderedObjects.forEach((sceneObject) => sceneObject.remove())

    // destroy indirect buffers
    this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.destroy())

    this.textures.forEach((texture) => texture.destroy())

    this.context?.unconfigure()
  }
}
