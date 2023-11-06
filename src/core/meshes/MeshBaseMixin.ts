import { generateUUID, throwWarning } from '../../utils/utils'
import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { RenderMaterial } from '../materials/RenderMaterial'
import { Texture } from '../textures/Texture'
import { Geometry } from '../geometries/Geometry'
import { RenderTexture } from '../textures/RenderTexture'
import { CurtainsTextureOptions, TextureDefaultParams, TextureParent } from '../../types/core/textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshType } from '../renderers/GPURenderer'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { Material } from '../materials/Material'
import { DOMElementBoundingRect } from '../DOM/DOMElement'
import { AllowedGeometries, RenderMaterialParams } from '../../types/Materials'

let meshIndex = 0

export interface MeshBaseParams extends RenderMaterialParams {
  geometry: AllowedGeometries
  autoAddToScene: boolean
  visible?: boolean
  renderOrder?: number
  renderTarget?: RenderTarget
  texturesOptions?: CurtainsTextureOptions
}

export interface MeshBaseOptions {
  label?: MeshBaseParams['label']
  shaders: MeshBaseParams['shaders']
  texturesOptions?: CurtainsTextureOptions
  renderTarget?: RenderTarget | null
  autoAddToScene?: boolean
  useAsyncPipeline?: boolean
}

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
export declare class MeshBaseClass {
  //#autoAddToScene: boolean
  type: string
  readonly uuid: string
  readonly index: number
  renderer: CameraRenderer

  options: MeshBaseOptions

  material: RenderMaterial
  geometry: MeshBaseParams['geometry']

  renderTextures: RenderTexture[]
  textures: Texture[]

  renderTarget: null | RenderTarget

  renderOrder: number
  transparent: boolean

  visible: boolean
  _ready: boolean

  // callbacks
  _onReadyCallback: () => void
  _onBeforeRenderCallback: () => void
  _onRenderCallback: () => void
  _onAfterRenderCallback: () => void
  _onAfterResizeCallback: () => void
  onReady: (callback: () => void) => MeshBaseClass
  onBeforeRender: (callback: () => void) => MeshBaseClass
  onRender: (callback: () => void) => MeshBaseClass
  onAfterRender: (callback: () => void) => MeshBaseClass
  onAfterResize: (callback: () => void) => MeshBaseClass

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  get autoAddToScene(): boolean // allow to read value from child classes

  get ready(): boolean
  set ready(value: boolean)

  setMaterial(meshParameters: RenderMaterialParams): void

  addToScene(): void
  removeFromScene(): void

  createTexture(options: TextureDefaultParams): Texture
  onTextureCreated(texture: Texture): void
  createRenderTexture(options: RenderTextureParams): RenderTexture

  setRenderTarget(renderTarget: RenderTarget | null): void

  get uniforms(): Material['uniforms']
  get storages(): Material['storages']

  resize(boundingRect?: DOMElementBoundingRect): void

  onBeforeRenderPass(): void
  onRenderPass(pass: GPURenderPassEncoder): void
  onAfterRenderPass(): void
  render(pass: GPURenderPassEncoder): void

  remove(): void
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
    type: string
    readonly uuid: string
    readonly index: number
    renderer: CameraRenderer

    options: MeshBaseOptions

    material: RenderMaterial
    geometry: MeshBaseParams['geometry']

    renderTextures: RenderTexture[]
    textures: Texture[]

    renderTarget: null | RenderTarget

    renderOrder: number
    transparent: boolean

    visible: boolean
    _ready: boolean

    #autoAddToScene = true

    // callbacks / events
    _onReadyCallback: () => void = () => {
      /* allow empty callback */
    }
    _onBeforeRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    _onRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    _onAfterRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    _onAfterResizeCallback: () => void = () => {
      /* allow empty callback */
    }

    /**
     * MeshBase constructor
     * @typedef {MeshBaseParams} MeshBaseParams
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
     * @property {CurtainsTextureOptions=} texturesOptions - textures options to apply
     * @property {Sampler[]=} samplers - array of {@link Sampler}
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
     * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
     * @property {MeshBaseParams} 2 - Mesh parameters

     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string | null,
        { ...defaultMeshBaseParams, ...params[2] } as MeshBaseParams
      )

      let renderer = params[0]
      const parameters = { ...defaultMeshBaseParams, ...params[2] }

      this.type = 'MeshBase'

      this.uuid = generateUUID()
      Object.defineProperty(this as MeshBase, 'index', { value: meshIndex++ })

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

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
     * Checks if the material is ready and eventually update its bindings
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
     * Render our {@link MeshBase}
     * @param pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      this._onRenderCallback && this._onRenderCallback()

      // render ou material
      this.material.render(pass)
      // then render our geometry, only if material is ready
      if (this.material.ready) this.geometry.render(pass)
    }

    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback()
    }

    /**
     * Render our Mesh
     * Basically just check if our {@link GPURenderer} is ready, and then render our {@link RenderMaterial}
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
     * Remove the Mesh from the scene and destroy it
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
