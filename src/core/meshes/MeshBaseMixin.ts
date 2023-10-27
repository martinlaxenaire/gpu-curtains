import { applyMixins, generateUUID, throwWarning } from '../../utils/utils'
import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { RenderMaterial } from '../materials/RenderMaterial'
import { Texture } from '../textures/Texture'
import { Geometry } from '../geometries/Geometry'
import { RenderTexture } from '../textures/RenderTexture'
import { CurtainsTextureOptions, TextureDefaultParams, TextureParent } from '../../types/core/textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { MeshBaseOptions, MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshType } from '../renderers/GPURenderer'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { RenderMaterialBaseParams, RenderMaterialParams } from '../../types/core/materials/RenderMaterial'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { Material } from '../materials/Material'
import { DOMElementBoundingRect } from '../DOM/DOMElement'
import { BufferBindingsUniform } from '../../types/core/bindings/BufferBindings'

let meshIndex = 0

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
export type GConstructor<T = {}> = new (...args: any[]) => T

// declare class EmptyClass {}
// export type ProjectedMeshBase = DOMObject3D | ProjectedObject3D
// export type AllowedMeshBase = ProjectedMeshBase | EmptyClass
// export type MixinConstructor = GConstructor<AllowedMeshBase>
//
// type Constructor = new (...args: any[]) => AllowedMeshBase

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

function MeshBaseMixin<TBase extends GConstructor>(Base: TBase): GConstructor<MeshBaseClass> & TBase {
  //function MeshBaseMixin<TBase extends GConstructor<AllowedMeshBase>>(Base: TBase) {
  //function MeshBaseMixin<TBase extends Constructor>(Base: TBase): TBase & Constructor {
  return class MeshBase extends Base {
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

    //constructor(renderer: CameraRenderer | GPUCurtains, element: HTMLElement | string, parameters: MeshBaseParams) {
    constructor(...params: any) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
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

    get autoAddToScene(): boolean {
      return this.#autoAddToScene
    }

    get ready(): boolean {
      return this._ready
    }

    set ready(value: boolean) {
      if (value) {
        this._onReadyCallback && this._onReadyCallback()
      }
      this._ready = value
    }

    setMeshMaterial(meshParameters: RenderMaterialParams) {
      this.transparent = meshParameters.transparent

      this.setMaterial(meshParameters)
    }

    setMaterial(materialParameters: RenderMaterialParams) {
      this.material = new RenderMaterial(this.renderer, materialParameters)
    }

    addToScene() {
      this.renderer.meshes.push(this as unknown as MeshType)

      if (this.#autoAddToScene) {
        this.renderer.scene.addMesh(this as unknown as MeshType)
      }
    }

    removeFromScene() {
      if (this.#autoAddToScene) {
        this.renderer.scene.removeMesh(this as unknown as MeshType)
      }

      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
    }

    /** TEXTURES **/

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

    onTextureCreated(texture: Texture) {
      /* will be overriden */
      texture.parent = this as unknown as TextureParent
    }

    createRenderTexture(options: RenderTextureParams): RenderTexture {
      if (!options.name) {
        options.name = 'renderTexture' + this.renderTextures.length
      }

      const renderTexture = new RenderTexture(this.renderer, options)

      this.material.addTexture(renderTexture)
      this.renderTextures.push(renderTexture)

      return renderTexture
    }

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

    get uniforms(): Material['uniforms'] {
      return this.material?.uniforms
    }

    get storages(): Material['storages'] {
      return this.material?.storages
    }

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

    onReady(callback: () => void): MeshBase {
      if (callback) {
        this._onReadyCallback = callback
      }

      return this
    }

    onBeforeRender(callback: () => void): MeshBase {
      if (callback) {
        this._onBeforeRenderCallback = callback
      }

      return this
    }

    onRender(callback: () => void): MeshBase {
      if (callback) {
        this._onRenderCallback = callback
      }

      return this
    }

    onAfterRender(callback: () => void): MeshBase {
      if (callback) {
        this._onAfterRenderCallback = callback
      }

      return this
    }

    onAfterResize(callback: () => void): MeshBaseClass {
      if (callback) {
        this._onAfterResizeCallback = callback
      }

      return this
    }

    /**
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
      }

      this._onBeforeRenderCallback && this._onBeforeRenderCallback()

      this.material.onBeforeRender()
    }

    onRenderPass(pass: GPURenderPassEncoder) {
      this._onRenderCallback && this._onRenderCallback()

      this.material.render(pass)
    }

    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback()
    }

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

    remove() {
      this.removeFromScene()
      this.destroy()
    }

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
