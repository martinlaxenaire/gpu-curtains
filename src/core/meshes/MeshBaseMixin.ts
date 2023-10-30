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
import { RenderMaterialParams } from '../../types/Materials'

let meshIndex = 0

export interface MeshBaseParams extends RenderMaterialParams {
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

  setMeshMaterial(meshParameters: RenderMaterialParams): void

  setMaterial(materialParameters: RenderMaterialParams): void

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
 * Used to mix basic Mesh properties and methods defined in {@see MeshBaseClass} with a given Base of type {@see Object3D}, {@see ProjectedObject3D} or an empty class.
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
     * @property {boolean=} autoAddToScene - whether we should add this MeshBase to our {@see Scene} to let it handle the rendering process automatically
     * @property {AllowedGeometries} geometry - geometry to draw
     * @property {boolean=} useAsyncPipeline - whether the {@see RenderPipelineEntry} should be compiled asynchronously
     * @property {MaterialShaders} shaders - our MeshBase shader codes and entry points
     * @property {BindGroupInputs=} inputs - our MeshBase {@see BindGroup} inputs
     * @property {BindGroup[]=} bindGroups - already created {@see BindGroup} to use
     * @property {boolean=} transparent - impacts the {@see RenderPipelineEntry} blend properties
     * @property {GPUCullMode=} cullMode - cull mode to use
     * @property {boolean=} visible - whether this Mesh should be visible (drawn) or not
     * @property {number=} renderOrder - controls the order in which this Mesh should be rendered by our {@see Scene}
     * @property {RenderTarget=} renderTarget - {@see RenderTarget} to render onto if any
     * @property {CurtainsTextureOptions=} texturesOptions - textures options to apply
     * @property {Sampler[]=} samplers - array of {@see Sampler}
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

      this.setMeshMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        ...meshParameters,
        geometry: this.geometry,
      } as RenderMaterialParams)

      this.addToScene()
    }

    /**
     * Get private #autoAddToScene value
     * @readonly
     * @type {boolean}
     */
    get autoAddToScene(): boolean {
      return this.#autoAddToScene
    }

    /**
     * Get/set whether a Mesh is ready or not
     * @readonly
     * @type {boolean}
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

    /**
     * Set a Mesh transparent property, then set its material
     * @param {RenderMaterialParams} meshParameters
     */
    setMeshMaterial(meshParameters: RenderMaterialParams) {
      this.transparent = meshParameters.transparent

      this.setMaterial(meshParameters)
    }

    /**
     * Set a Mesh material
     * @param {RenderMaterialParams} materialParameters
     */
    setMaterial(materialParameters: RenderMaterialParams) {
      this.material = new RenderMaterial(this.renderer, materialParameters)
    }

    /**
     * Add a Mesh to the renderer and the {@see Scene}
     */
    addToScene() {
      this.renderer.meshes.push(this as unknown as MeshType)

      if (this.#autoAddToScene) {
        this.renderer.scene.addMesh(this as unknown as MeshType)
      }
    }

    /**
     * Remove a Mesh from the renderer and the {@see Scene}
     */
    removeFromScene() {
      if (this.#autoAddToScene) {
        this.renderer.scene.removeMesh(this as unknown as MeshType)
      }

      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
    }

    /** TEXTURES **/

    /**
     * Create a new {@see Texture}
     * @param {TextureDefaultParams} options - Texture options
     * @returns {Texture} - newly created Texture
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
     * Callback run when a new {@see Texture} has been created
     * @param {Texture} texture - newly created Texture
     */
    onTextureCreated(texture: Texture) {
      /* will be overriden */
      texture.parent = this as unknown as TextureParent
    }

    /**
     * Create a new {@see RenderTexture}
     * @param {RenderTextureParams} options - RenderTexture options
     * @returns {RenderTexture} - newly created RenderTexture
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
     * Assign or remove a {@see RenderTarget} to this Mesh
     * Since this manipulates the {@see Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param {?RenderTarget} renderTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
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

    /*** BINDINGS ***/

    /**
     * Get the current {@see RenderMaterial} uniforms
     * @readonly
     * @type {Material['uniforms']}
     */
    get uniforms(): Material['uniforms'] {
      return this.material?.uniforms
    }

    /**
     * Get the current {@see RenderMaterial} storages
     * @readonly
     * @type {Material['storages']}
     */
    get storages(): Material['storages'] {
      return this.material?.storages
    }

    /**
     * Resize the Mesh's textures
     * @param {?DOMElementBoundingRect} boundingRect
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

    /** EVENTS **/

    /**
     * Assign a callback function to _onReadyCallback
     * @param {function=} callback - callback to run when {@see MeshBase} is ready
     * @returns {MeshBase}
     */
    onReady(callback: () => void): MeshBase {
      if (callback) {
        this._onReadyCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param {function=} callback - callback to run just before {@see MeshBase} will be rendered
     * @returns {MeshBase}
     */
    onBeforeRender(callback: () => void): MeshBase {
      if (callback) {
        this._onBeforeRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onRenderCallback
     * @param {function=} callback - callback to run when {@see MeshBase} is rendered
     * @returns {MeshBase}
     */
    onRender(callback: () => void): MeshBase {
      if (callback) {
        this._onRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param {function=} callback - callback to run just after {@see MeshBase} has been rendered
     * @returns {MeshBase}
     */
    onAfterRender(callback: () => void): MeshBase {
      if (callback) {
        this._onAfterRenderCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param {function=} callback - callback to run just after {@see MeshBase} has been resized
     * @returns {MeshBase}
     */
    onAfterResize(callback: () => void): MeshBase {
      if (callback) {
        this._onAfterResizeCallback = callback
      }

      return this
    }

    /**
     * Called before rendering the Mesh
     * Checks if the material is ready and eventually update its bindings
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
      }

      this._onBeforeRenderCallback && this._onBeforeRenderCallback()

      this.material.onBeforeRender()
    }

    /**
     * Render our {@see MeshBase}
     * @param {GPURenderPassEncoder} pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      this._onRenderCallback && this._onRenderCallback()

      this.material.render(pass)
    }

    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback()
    }

    /**
     * Render our Mesh
     * Basically just check if our {@see GPURenderer} is ready, and then render our {@see RenderMaterial}
     * @param {GPURenderPassEncoder} pass
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
      this.geometry = null

      this.renderTextures = []
      this.textures = []
    }
  }
}

export default MeshBaseMixin
