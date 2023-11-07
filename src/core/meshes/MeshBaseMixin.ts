import { generateUUID, throwWarning } from '../../utils/utils'
import { Renderer, isRenderer } from '../../utils/renderer-utils'
import { RenderMaterial } from '../materials/RenderMaterial'
import { Texture } from '../textures/Texture'
import { Geometry } from '../geometries/Geometry'
import { RenderTexture } from '../textures/RenderTexture'
import { MeshTextureParams, TextureDefaultParams, TextureParent } from '../../types/core/textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshType } from '../renderers/GPURenderer'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { Material } from '../materials/Material'
import { DOMElementBoundingRect } from '../DOM/DOMElement'
import { AllowedGeometries, RenderMaterialParams } from '../../types/Materials'

let meshIndex = 0

/**
 * Base parameters used to create a Mesh
 */
export interface MeshBaseParams extends RenderMaterialParams {
  /** Geometry to use */
  geometry: AllowedGeometries
  /** Whether we should add this Mesh to our {@link Scene} to let it handle the rendering process automatically */
  autoAddToScene: boolean
  /** Flag indicating whether to draw this Mesh or not */
  visible?: boolean
  /** Controls the order in which this Mesh should be rendered by our {@link Scene} */
  renderOrder?: number
  /** {@link RenderTarget} to render this Mesh to */
  renderTarget?: RenderTarget
  /** Parameters used by this Mesh to create a [texture]{@link Texture} */
  texturesOptions?: MeshTextureParams
}

/**
 *  Base options used to create this Mesh
 */
export interface MeshBaseOptions {
  /** The label of this Mesh, sent to various GPU objects for debugging purpose */
  label?: MeshBaseParams['label']
  /** Shaders to use by this Mesh {@link RenderMaterial} */
  shaders: MeshBaseParams['shaders']
  /** Parameters used by this Mesh to create a [texture]{@link Texture} */
  texturesOptions?: MeshTextureParams
  /** {@link RenderTarget} to render this Mesh to, if any */
  renderTarget?: RenderTarget | null
  /** Whether we should add this Mesh to our {@link Scene} to let it handle the rendering process automatically */
  autoAddToScene?: boolean
  /** Whether to compile this Mesh {@link RenderMaterial} [render pipeline]{@link RenderPipelineEntry#pipeline} asynchronously or not */
  useAsyncPipeline?: boolean
}

/** @const - Default Mesh parameters to merge with user defined parameters */
const defaultMeshBaseParams = {
  label: 'Mesh',
  // geometry
  geometry: new Geometry(),
  // material
  shaders: {},
  autoAddToScene: true,
  useProjection: false,
  cullMode: 'back',
  depthWriteEnabled: true,
  depthCompare: 'less',
  transparent: false,
  visible: true,
  renderOrder: 0,
  texturesOptions: {},
} as MeshBaseParams

// To get started, we need a type which we'll use to extend
// other classes from. The main responsibility is to declare
// that the type being passed in is a class.
// We use a generic version which can apply a constraint on
// the class which this mixin is applied to
export type MixinConstructor<T = {}> = new (...args: any[]) => T

// based on https://stackoverflow.com/a/75673107/13354068
// we declare first a class, and then the mixin with a return type
/**
 * MeshBaseClass - {@link MeshBase} typescript definition
 */
export declare class MeshBaseClass {
  /** The type of the {@link MeshBaseClass} */
  type: string
  /** The universal unique id of the {@link MeshBaseClass} */
  readonly uuid: string
  /** Index of this {@link MeshBaseClass}, i.e. creation order */
  readonly index: number
  /** The {@link Renderer} used */
  renderer: Renderer

  /** Options used to create this {@link MeshBaseClass} */
  options: MeshBaseOptions

  /** {@link RenderMaterial} used by this {@link MeshBaseClass} */
  material: RenderMaterial
  /** [Geometry]{@link AllowedGeometries} used by this {@link MeshBaseClass} */
  geometry: MeshBaseParams['geometry']

  /** Array of {@link RenderTexture} handled by this {@link MeshBaseClass} */
  renderTextures: RenderTexture[]
  /** Array of {@link Texture} handled by this {@link MeshBaseClass} */
  textures: Texture[]

  /** {@link RenderTarget} to render this {@link MeshBase} to, if any */
  renderTarget: null | RenderTarget

  /** Controls the order in which this {@link MeshBaseClass} should be rendered by our {@link Scene} */
  renderOrder: number
  /** Whether this {@link MeshBaseClass} should be treated as transparent. Impacts the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
  transparent: boolean

  /** Flag indicating whether to draw this {@link MeshBaseClass} or not */
  visible: boolean
  /** Flag indicating whether this {@link MeshBaseClass} is ready to be drawn */
  _ready: boolean

  // callbacks
  /** function assigned to the [onReady]{@link MeshBaseClass#onReady} callback */
  _onReadyCallback: () => void
  /** function assigned to the [onBeforeRender]{@link MeshBaseClass#onBeforeRender} callback */
  _onBeforeRenderCallback: () => void
  /** function assigned to the [onRender]{@link MeshBaseClass#onRender} callback */
  _onRenderCallback: () => void
  /** function assigned to the [onAfterRender]{@link MeshBaseClass#onAfterRender} callback */
  _onAfterRenderCallback: () => void
  /** function assigned to the [onAfterResize]{@link MeshBaseClass#onAfterResize} callback */
  _onAfterResizeCallback: () => void
  /**
   * Assign a callback function to _onReadyCallback
   * @param callback - callback to run when {@link MeshBaseClass} is ready
   * @returns - our Mesh
   */
  onReady: (callback: () => void) => MeshBaseClass
  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param callback - callback to run just before {@link MeshBaseClass} will be rendered
   * @returns - our Mesh
   */
  onBeforeRender: (callback: () => void) => MeshBaseClass
  /**
   * Assign a callback function to _onRenderCallback
   * @param callback - callback to run when {@link MeshBaseClass} is rendered
   * @returns - our Mesh
   */
  onRender: (callback: () => void) => MeshBaseClass
  /**
   * Assign a callback function to _onAfterRenderCallback
   * @param callback - callback to run just after {@link MeshBaseClass} has been rendered
   * @returns - our Mesh
   */
  onAfterRender: (callback: () => void) => MeshBaseClass
  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param callback - callback to run just after {@link MeshBaseClass} has been resized
   * @returns - our Mesh
   */
  onAfterResize: (callback: () => void) => MeshBaseClass

  /**
   * {@link MeshBaseClass} constructor
   * @param renderer - our [renderer]{@link Renderer} class object
   * @param element - a DOM HTML Element that can be bound to a Mesh
   * @param parameters - [Mesh base parameters]{@link MeshBaseParams}
   */
  constructor(renderer: Renderer, element: HTMLElement | null, parameters: MeshBaseParams)

  /**
   * Get private #autoAddToScene value
   * @readonly
   */
  get autoAddToScene(): boolean // allow to read value from child classes

  /**
   * Get/set whether a Mesh is ready or not
   * @readonly
   */
  get ready(): boolean
  set ready(value: boolean)

  /**
   * Add a Mesh to the renderer and the {@link Scene}
   */
  addToScene(): void
  /**
   * Remove a Mesh from the renderer and the {@link Scene}
   */
  removeFromScene(): void

  /**
   * Compute the Mesh geometry if needed
   */
  computeGeometry(): void
  /**
   * Create the Mesh Geometry vertex and index buffers if needed
   */
  createGeometryBuffers(): void
  /**
   * Set our Mesh geometry: create buffers and add attributes to material
   */
  setGeometry(): void

  /**
   * Set a Mesh transparent property, then set its material
   * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
   */
  setMaterial(meshParameters: RenderMaterialParams): void
  /**
   * Set Mesh material attributes
   */
  setMaterialGeometryAttributes(): void

  /**
   * Create a new {@link Texture}
   * @param options - [Texture options]{@link TextureDefaultParams}
   * @returns - newly created Texture
   */
  createTexture(options: TextureDefaultParams): Texture
  /**
   * Callback run when a new {@link Texture} has been created
   * @param texture - newly created Texture
   */
  onTextureCreated(texture: Texture): void
  /**
   * Create a new {@link RenderTexture}
   * @param  options - [RenderTexture options]{@link RenderTextureParams}
   * @returns - newly created RenderTexture
   */
  createRenderTexture(options: RenderTextureParams): RenderTexture

  /**
   * Assign or remove a {@link RenderTarget} to this Mesh
   * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
   * @param renderTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
   */
  setRenderTarget(renderTarget: RenderTarget | null): void

  /**
   * Get the current {@link RenderMaterial} uniforms
   * @readonly
   */
  get uniforms(): Material['uniforms']
  /**
   * Get the current {@link RenderMaterial} storages
   * @readonly
   */
  get storages(): Material['storages']

  /**
   * Resize the Mesh's textures
   * @param boundingRect
   */
  resize(boundingRect?: DOMElementBoundingRect): void

  /**
   * Called before rendering the Mesh
   * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
   * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
   */
  onBeforeRenderPass(): void
  /**
   * Render our {@link MeshBaseClass} if the {@link RenderMaterial} is ready
   * @param pass - current render pass encoder
   */
  onRenderPass(pass: GPURenderPassEncoder): void
  /**
   * Called after having rendered the Mesh
   */
  onAfterRenderPass(): void
  /**
   * Render our Mesh
   * - Execute [onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass}
   * - Stop here if [renderer]{@link Renderer} is not ready or Mesh is not [visible]{@link MeshBaseClass#visible}
   * - Execute super render call if it exists
   * - [Render]{@link MeshBaseClass#onRenderPass} our {@link RenderMaterial} and geometry
   * - Execute [onAfterRenderPass]{@link MeshBaseClass#onAfterRenderPass}
   * @param pass - current render pass encoder
   */
  render(pass: GPURenderPassEncoder): void

  /**
   * Remove the Mesh from the {@link Scene} and destroy it
   */
  remove(): void
  /**
   * Destroy the Mesh
   */
  destroy(): void
}

/**
 * MeshBase Mixin:
 * Used to mix basic Mesh properties and methods defined in {@link MeshBaseClass} with a given Base of type {@link Object3D}, {@link ProjectedObject3D} or an empty class.
 * @exports MeshBaseMixin
 * @param {*} Base - the class to mix onto
 * @returns {module:MeshBaseMixin~MeshBase} - the mixin class.
 */
function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase {
  /**
   * MeshBase defines our base properties and methods
   * @mixin
   * @alias MeshBase
   */
  return class MeshBase extends Base implements MeshBaseClass {
    /** The type of the {@link MeshBase} */
    type: string
    /** The universal unique id of the {@link MeshBase} */
    readonly uuid: string
    /** Index of this {@link MeshBase}, i.e. creation order */
    readonly index: number
    /** The {@link Renderer} used */
    renderer: Renderer

    /** Options used to create this {@link MeshBase} */
    options: MeshBaseOptions

    /** {@link RenderMaterial} used by this {@link MeshBase} */
    material: RenderMaterial
    /** [Geometry]{@link AllowedGeometries} used by this {@link MeshBase} */
    geometry: MeshBaseParams['geometry']

    /** Array of {@link RenderTexture} handled by this {@link MeshBase} */
    renderTextures: RenderTexture[]
    /** Array of {@link Texture} handled by this {@link MeshBase} */
    textures: Texture[]

    /** {@link RenderTarget} to render this {@link MeshBase} to, if any */
    renderTarget: null | RenderTarget

    /** Controls the order in which this {@link MeshBase} should be rendered by our {@link Scene} */
    renderOrder: number
    /** Whether this {@link MeshBase} should be treated as transparent. Impacts the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
    transparent: boolean

    /** Flag indicating whether to draw this {@link MeshBase} or not */
    visible: boolean
    /** Flag indicating whether this {@link MeshBase} is ready to be drawn */
    _ready: boolean

    /** Whether we should add this {@link MeshBase} to our {@link Scene} to let it handle the rendering process automatically */
    #autoAddToScene = true

    // callbacks / events
    /** function assigned to the [onReady]{@link MeshBase#onReady} callback */
    _onReadyCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onBeforeRender]{@link MeshBase#onBeforeRender} callback */
    _onBeforeRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onRender]{@link MeshBase#onRender} callback */
    _onRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onAfterRender]{@link MeshBase#onAfterRender} callback */
    _onAfterRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onAfterResize]{@link MeshBase#onAfterResize} callback */
    _onAfterResizeCallback: () => void = () => {
      /* allow empty callback */
    }

    /**
     * MeshBase constructor
     * @typedef MeshBaseParams
     * @property {string=} label - MeshBase label
     * @property {boolean=} autoAddToScene - whether we should add this MeshBase to our {@link Scene} to let it handle the rendering process automatically
     * @property {AllowedGeometries} geometry - geometry to draw
     * @property {boolean=} useAsyncPipeline - whether the {@link RenderPipelineEntry} should be compiled asynchronously
     * @property {MaterialShaders} shaders - our MeshBase shader codes and entry points
     * @property {BindGroupInputs=} inputs - our MeshBase {@link BindGroup} inputs
     * @property {BindGroup[]=} bindGroups - already created {@link BindGroup} to use
     * @property {boolean=} transparent - impacts the {@link RenderPipelineEntry} blend properties
     * @property {GPUCullMode=} cullMode - cull mode to use
     * @property {boolean=} visible - whether this Mesh should be visible (drawn) or not
     * @property {number=} renderOrder - controls the order in which this Mesh should be rendered by our {@link Scene}
     * @property {RenderTarget=} renderTarget - {@link RenderTarget} to render onto if any
     * @property {MeshTextureParams=} texturesOptions - textures options to apply
     * @property {Sampler[]=} samplers - array of {@link Sampler}
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(Renderer|GPUCurtains)} 0 - our [renderer]{@link Renderer} class object
     * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
     * @property {MeshBaseParams} 2 - [Mesh base parameters]{@link MeshBaseParams}

     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params: any[]) {
      super(
        params[0] as Renderer | GPUCurtains,
        params[1] as HTMLElement | string | null,
        { ...defaultMeshBaseParams, ...params[2] } as MeshBaseParams
      )

      let renderer = params[0]
      const parameters = { ...defaultMeshBaseParams, ...params[2] }

      this.type = 'MeshBase'

      this.uuid = generateUUID()
      Object.defineProperty(this as MeshBase, 'index', { value: meshIndex++ })

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

      isRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      this.textures = []
      this.renderTextures = []

      const {
        label,
        shaders,
        geometry,
        visible,
        renderOrder,
        renderTarget,
        texturesOptions,
        autoAddToScene,
        verticesOrder,
        ...meshParameters
      } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        label,
        shaders,
        texturesOptions,
        ...(renderTarget !== undefined && { renderTarget }),
        ...(autoAddToScene !== undefined && { autoAddToScene }),
        ...(meshParameters.useAsyncPipeline !== undefined && { useAsyncPipeline: meshParameters.useAsyncPipeline }),
      }

      this.renderTarget = renderTarget ?? null

      this.geometry = geometry

      if (autoAddToScene !== undefined) {
        this.#autoAddToScene = autoAddToScene
      }

      this.visible = visible
      this.renderOrder = renderOrder
      this.ready = false

      this.computeGeometry()

      this.setMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        ...{ ...meshParameters, verticesOrder: verticesOrder ?? geometry.verticesOrder },
      } as RenderMaterialParams)

      this.addToScene()
    }

    /**
     * Get private #autoAddToScene value
     * @readonly
     */
    get autoAddToScene(): boolean {
      return this.#autoAddToScene
    }

    /**
     * Get/set whether a Mesh is ready or not
     * @readonly
     */
    get ready(): boolean {
      return this._ready
    }

    set ready(value: boolean) {
      if (value) {
        this._onReadyCallback && this._onReadyCallback()
      }
      this._ready = value
    }

    /* SCENE */

    /**
     * Add a Mesh to the renderer and the {@link Scene}
     */
    addToScene() {
      this.renderer.meshes.push(this as unknown as MeshType)

      if (this.#autoAddToScene) {
        this.renderer.scene.addMesh(this as unknown as MeshType)
      }
    }

    /**
     * Remove a Mesh from the renderer and the {@link Scene}
     */
    removeFromScene() {
      if (this.#autoAddToScene) {
        this.renderer.scene.removeMesh(this as unknown as MeshType)
      }

      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
    }

    /* GEOMETRY */

    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry()
      }
    }

    /**
     * Create the Mesh Geometry vertex and index buffers if needed
     */
    createGeometryBuffers() {
      if (!this.geometry.ready) {
        this.geometry.vertexBuffers.forEach((vertexBuffer) => {
          if (!vertexBuffer.buffer) {
            vertexBuffer.buffer = this.renderer.createBuffer({
              label: this.options.label + ': Vertex buffer vertices',
              size: vertexBuffer.array.byteLength,
              usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })

            this.renderer.queueWriteBuffer(vertexBuffer.buffer, 0, vertexBuffer.array)
          }
        })

        // if it's an indexed geometry, create index GPUBuffer as well
        if ('indexBuffer' in this.geometry && this.geometry.indexBuffer && !this.geometry.indexBuffer.buffer) {
          this.geometry.indexBuffer.buffer = this.renderer.createBuffer({
            label: this.options.label + ': Index buffer vertices',
            size: this.geometry.indexBuffer.array.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          })

          this.renderer.queueWriteBuffer(this.geometry.indexBuffer.buffer, 0, this.geometry.indexBuffer.array)
        }
      }
    }

    /**
     * Set our Mesh geometry: create buffers and add attributes to material
     */
    setGeometry() {
      if (this.geometry && this.renderer.ready) {
        this.createGeometryBuffers()
        this.setMaterialGeometryAttributes()
      }
    }

    /* MATERIAL */

    /**
     * Set a Mesh transparent property, then set its material
     * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      this.transparent = meshParameters.transparent

      this.material = new RenderMaterial(this.renderer, meshParameters)
    }

    /**
     * Set Mesh material attributes
     */
    setMaterialGeometryAttributes() {
      if (this.material && !this.material.attributes) {
        this.material.setAttributesFromGeometry(this.geometry)
      }
    }

    /* TEXTURES */

    /**
     * Create a new {@link Texture}
     * @param options - [Texture options]{@link TextureDefaultParams}
     * @returns - newly created Texture
     */
    createTexture(options: TextureDefaultParams): Texture {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      if (!options.label) {
        options.label = this.options.label + ' ' + options.name
      }

      const texture = new Texture(this.renderer, { ...options, texture: this.options.texturesOptions })

      this.material.addTexture(texture)

      this.textures.push(texture)

      this.onTextureCreated(texture)

      return texture
    }

    /**
     * Callback run when a new {@link Texture} has been created
     * @param texture - newly created Texture
     */
    onTextureCreated(texture: Texture) {
      /* will be overriden */
      texture.parent = this as unknown as TextureParent
    }

    /**
     * Create a new {@link RenderTexture}
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
     * @returns - newly created RenderTexture
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture {
      if (!options.name) {
        options.name = 'renderTexture' + this.renderTextures.length
      }

      const renderTexture = new RenderTexture(this.renderer, options)

      this.material.addTexture(renderTexture)
      this.renderTextures.push(renderTexture)

      return renderTexture
    }

    /**
     * Assign or remove a {@link RenderTarget} to this Mesh
     * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param renderTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setRenderTarget(renderTarget: RenderTarget | null) {
      if (renderTarget && renderTarget.type !== 'RenderTarget') {
        throwWarning(`${this.options.label ?? this.type}: renderTarget is not a RenderTarget: ${renderTarget}`)
        return
      }

      // ensure the mesh is in the correct scene stack
      this.removeFromScene()
      this.renderTarget = renderTarget
      this.addToScene()
    }

    /* BINDINGS */

    /**
     * Get the current {@link RenderMaterial} uniforms
     * @readonly
     */
    get uniforms(): Material['uniforms'] {
      return this.material?.uniforms
    }

    /**
     * Get the current {@link RenderMaterial} storages
     * @readonly
     */
    get storages(): Material['storages'] {
      return this.material?.storages
    }

    /**
     * Resize the Mesh's textures
     * @param boundingRect
     */
    resize(boundingRect: DOMElementBoundingRect | null = null) {
      // resize render textures first
      this.renderTextures?.forEach((renderTexture) => renderTexture.resize())

      // @ts-ignore
      if (super.resize) {
        // @ts-ignore
        super.resize(boundingRect)
      }

      // resize textures
      this.textures?.forEach((texture) => {
        texture.resize()
      })

      this._onAfterResizeCallback && this._onAfterResizeCallback()
    }

    /* EVENTS */

    /**
     * Assign a callback function to _onReadyCallback
     * @param callback - callback to run when {@link MeshBase} is ready
     * @returns - our Mesh
     */
    onReady(callback: () => void): MeshBase {
      if (callback) {
        this._onReadyCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before {@link MeshBase} will be rendered
     * @returns - our Mesh
     */
    onBeforeRender(callback: () => void): MeshBase {
      if (callback) {
        this._onBeforeRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onRenderCallback
     * @param callback - callback to run when {@link MeshBase} is rendered
     * @returns - our Mesh
     */
    onRender(callback: () => void): MeshBase {
      if (callback) {
        this._onRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after {@link MeshBase} has been rendered
     * @returns - our Mesh
     */
    onAfterRender(callback: () => void): MeshBase {
      if (callback) {
        this._onAfterRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just after {@link MeshBase} has been resized
     * @returns - our Mesh
     */
    onAfterResize(callback: () => void): MeshBase {
      if (callback) {
        this._onAfterResizeCallback = callback
      }

      return this
    }

    /* RENDER */

    /**
     * Called before rendering the Mesh
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      if (this.material && this.material.ready && this.geometry && this.geometry.ready && !this.ready) {
        this.ready = true
      }

      this.setGeometry()

      this._onBeforeRenderCallback && this._onBeforeRenderCallback()

      this.material.onBeforeRender()
    }

    /**
     * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
     * @param pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      if (!this.material.ready) return

      this._onRenderCallback && this._onRenderCallback()

      // render ou material
      this.material.render(pass)
      // then render our geometry
      this.geometry.render(pass)
    }

    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback()
    }

    /**
     * Render our Mesh
     * - Execute [onBeforeRenderPass]{@link MeshBase#onBeforeRenderPass}
     * - Stop here if [renderer]{@link Renderer} is not ready or Mesh is not [visible]{@link MeshBase#visible}
     * - Execute super render call if it exists
     * - [Render]{@link MeshBase#onRenderPass} our {@link RenderMaterial} and geometry
     * - Execute [onAfterRenderPass]{@link MeshBase#onAfterRenderPass}
     * @param pass - current render pass encoder
     */
    render(pass: GPURenderPassEncoder) {
      this.onBeforeRenderPass()

      // no point to render if the WebGPU device is not ready
      if (!this.renderer.ready || !this.visible) return

      // @ts-ignore
      if (super.render) {
        // @ts-ignore
        super.render()
      }

      this.onRenderPass(pass)

      this.onAfterRenderPass()
    }

    /* DESTROY */

    /**
     * Remove the Mesh from the {@link Scene} and destroy it
     */
    remove() {
      this.removeFromScene()
      this.destroy()
    }

    /**
     * Destroy the Mesh
     */
    destroy() {
      // @ts-ignore
      if (super.destroy) {
        // @ts-ignore
        super.destroy()
      }

      // TODO destroy anything else?
      this.material?.destroy()
      this.geometry?.destroy()

      this.renderTextures = []
      this.textures = []
    }
  }
}

export default MeshBaseMixin
