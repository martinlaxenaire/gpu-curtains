import { generateUUID, throwError, throwWarning } from '../../../utils/utils'
import { isRenderer, Renderer } from '../../renderers/utils'
import { RenderMaterial } from '../../materials/RenderMaterial'
import { Texture } from '../../textures/Texture'
import { Geometry } from '../../geometries/Geometry'
import { RenderTexture, RenderTextureParams } from '../../textures/RenderTexture'
import { ExternalTextureParams, TextureParams, TextureParent } from '../../../types/Textures'
import { RenderTarget } from '../../renderPasses/RenderTarget'
import { GPUCurtains } from '../../../curtains/GPUCurtains'
import { ProjectedMesh, SceneStackedMesh } from '../../renderers/GPURenderer'
import { Material } from '../../materials/Material'
import { DOMElementBoundingRect } from '../../DOM/DOMElement'
import { AllowedGeometries, RenderMaterialParams, ShaderOptions } from '../../../types/Materials'
import { ProjectedMeshBaseClass } from './ProjectedMeshBaseMixin'
import default_vsWgsl from '../../shaders/chunks/default_vs.wgsl'
import default_fsWgsl from '../../shaders/chunks/default_fs.wgsl'
import { RenderPass } from '../../renderPasses/RenderPass'

let meshIndex = 0

export interface MeshBaseRenderParams extends RenderMaterialParams {
  /** Whether we should add this Mesh to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
  autoRender?: boolean
  /** Flag indicating whether to draw this Mesh or not */
  visible?: boolean
  /** Controls the order in which this Mesh should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
  renderOrder?: number
  /** Optional {@link RenderTarget} to render this Mesh to instead of the canvas context. */
  outputTarget?: RenderTarget
  /** Parameters used by this Mesh to create a {@link Texture} */
  texturesOptions?: ExternalTextureParams
}

/**
 * Base parameters used to create a Mesh
 */
export interface MeshBaseParams extends MeshBaseRenderParams {
  /** Geometry to use */
  geometry?: AllowedGeometries
}

/**
 *  Base options used to create this Mesh
 */
export interface MeshBaseOptions extends RenderMaterialParams {
  /** The label of this Mesh, sent to various GPU objects for debugging purpose */
  label?: MeshBaseParams['label']
  /** Shaders to use by this Mesh {@link RenderMaterial} */
  shaders?: MeshBaseParams['shaders']
  /** Parameters used by this Mesh to create a {@link Texture} */
  texturesOptions?: ExternalTextureParams
  /** {@link RenderTarget} to render this Mesh to instead of the canvas context, if any. */
  outputTarget?: RenderTarget | null
  /** Whether we should add this Mesh to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
  autoRender?: boolean
  /** Whether to compile this Mesh {@link RenderMaterial} {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} asynchronously or not */
  useAsyncPipeline?: boolean
}

/** @const - Default Mesh parameters to merge with user defined parameters */
const defaultMeshBaseParams: MeshBaseParams = {
  // geometry
  //geometry: new Geometry(),
  // material
  autoRender: true,
  useProjection: false,
  useAsyncPipeline: true,
  // rendering
  cullMode: 'back',
  depth: true,
  depthWriteEnabled: true,
  depthCompare: 'less',
  depthFormat: 'depth24plus',
  transparent: false,
  visible: true,
  renderOrder: 0,
  // textures
  texturesOptions: {},
}

// based on https://stackoverflow.com/a/75673107/13354068
// we declare first a class, and then the mixin with a return type
/**
 * This class describes the properties and methods to set up a basic Mesh, implemented in the {@link MeshBaseMixin}:
 * - Set and render the {@link Geometry} and {@link RenderMaterial}
 * - Add helpers to create {@link Texture} and {@link RenderTexture}
 * - Handle resizing, device lost/restoration and destroying the resources
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
  /** {@link AllowedGeometries | Geometry} used by this {@link MeshBaseClass} */
  geometry: MeshBaseParams['geometry']

  /** {@link RenderTarget} to render this Mesh to instead of the canvas context, if any. */
  outputTarget: null | RenderTarget

  /** Controls the order in which this {@link MeshBaseClass} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
  renderOrder: number
  /** Whether this {@link MeshBaseClass} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} blend properties */
  transparent: boolean

  /** Flag indicating whether to draw this {@link MeshBaseClass} or not */
  visible: boolean
  /** Flag indicating whether this {@link MeshBaseClass} is ready to be drawn */
  _ready: boolean

  /** Empty object to store any additional data or custom properties into your Mesh. */
  userData: Record<string, unknown>

  // callbacks
  /** function assigned to the {@link onReady} callback */
  _onReadyCallback: () => void
  /** function assigned to the {@link onBeforeRender} callback */
  _onBeforeRenderCallback: () => void
  /** function assigned to the {@link onRender} callback */
  _onRenderCallback: () => void
  /** function assigned to the {@link onAfterRender} callback */
  _onAfterRenderCallback: () => void
  /** function assigned to the {@link onAfterResize} callback */
  _onAfterResizeCallback: () => void

  /**
   * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
   * @param callback - callback to run when {@link MeshBaseClass} is ready
   * @returns - our Mesh
   */
  onReady: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass

  /**
   * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
   * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
   * @returns - our Mesh
   */
  onBeforeRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass

  /**
   * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
   * @param callback - callback to run just before rendering the {@link MeshBaseClass}.
   * @returns - our Mesh
   */
  onRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass

  /**
   * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
   * @param callback - callback to run just after {@link MeshBaseClass} has been rendered
   * @returns - our Mesh
   */
  onAfterRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass

  /**
   * Callback to execute just after a Mesh has been resized.
   * @param callback - callback to run just after {@link MeshBaseClass} has been resized
   * @returns - our Mesh
   */
  onAfterResize: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass

  /**
   * {@link MeshBaseClass} constructor
   * @param renderer - our {@link Renderer} class object
   * @param element - a DOM HTML Element that can be bound to a Mesh
   * @param parameters - {@link MeshBaseParams | Mesh base parameters}
   */
  constructor(renderer: Renderer, element: HTMLElement | null, parameters: MeshBaseParams)

  /**
   * Get private #autoRender value
   * @readonly
   */
  get autoRender(): boolean // allow to read value from child classes

  /**
   * Get/set whether a Mesh is ready or not
   * @readonly
   */
  get ready(): boolean
  set ready(value: boolean)

  /**
   * Add a Mesh to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene(): void

  /**
   * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene(): void

  /**
   * Set a new {@link Renderer} for this Mesh
   * @param renderer - new {@link Renderer} to set
   */
  setRenderer(renderer: Renderer | GPUCurtains): void

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
   */
  loseContext(): void

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
   */
  restoreContext(): void

  /**
   * Set default shaders if one or both of them are missing
   */
  setShaders(): void

  /**
   * Set our Mesh geometry: create buffers and add attributes to material
   */
  setGeometry(): void

  /**
   * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
   * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
   */
  setRenderingOptionsForRenderPass(renderPass: RenderPass): void

  /**
   * Hook used to clean up parameters before sending them to the material.
   * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
   * @returns - cleaned parameters
   */
  cleanupRenderMaterialParameters(parameters: MeshBaseRenderParams): MeshBaseRenderParams

  /**
   * Set a Mesh transparent property, then set its material
   * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
   */
  setMaterial(meshParameters: RenderMaterialParams): void

  /**
   * Set Mesh material attributes
   */
  setMaterialGeometryAttributes(): void

  /**
   * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
   * @readonly
   */
  get textures(): Texture[]

  /**
   * Get our {@link RenderMaterial#renderTextures | RenderMaterial render textures array}
   * @readonly
   */
  get renderTextures(): RenderTexture[]

  /**
   * Create a new {@link Texture}
   * @param options - {@link TextureParams | Texture parameters}
   * @returns - newly created Texture
   */
  createTexture(options: TextureParams): Texture

  /**
   * Add a {@link Texture}
   * @param texture - {@link Texture} to add
   */
  addTexture(texture: Texture)

  /**
   * Callback run when a new {@link Texture} has been created
   * @param texture - newly created Texture
   */
  onTextureAdded(texture: Texture): void

  /**
   * Create a new {@link RenderTexture}
   * @param  options - {@link RenderTextureParams | RenderTexture parameters}
   * @returns - newly created RenderTexture
   */
  createRenderTexture(options: RenderTextureParams): RenderTexture

  /**
   * Add a {@link RenderTexture}
   * @param renderTexture - {@link RenderTexture} to add
   */
  addRenderTexture(renderTexture: RenderTexture)

  /**
   * Assign or remove a {@link RenderTarget} to this Mesh
   * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
   * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
   */
  setOutputTarget(outputTarget: RenderTarget | null): void

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
   * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
   */
  onBeforeRenderScene(): void

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
   * - Execute {@link onBeforeRenderPass}
   * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}
   * - Execute super render call if it exists
   * - {@link onRenderPass | render} our {@link material} and {@link geometry}
   * - Execute {@link onAfterRenderPass}
   * @param pass - current render pass encoder
   */
  render(pass: GPURenderPassEncoder): void

  /**
   * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
   */
  remove(): void

  /**
   * Destroy the Mesh
   */
  destroy(): void
}

/**
 * Constructor function, that creates a new instance of the given type.
 * @constructor
 * @template T - the base constructor
 * @param args - The arguments passed to the constructor.
 * @returns - An instance of the mixin.
 */
export type MixinConstructor<T = {}> = new (...args: any[]) => T

/**
 * Used to mix the basic Mesh properties and methods defined in {@link MeshBaseClass} (basically, set a {@link Geometry} and a {@link RenderMaterial} and render them, add helpers to create {@link Texture} and {@link RenderTexture}) with a given Base of type {@link core/objects3D/Object3D.Object3D | Object3D}, {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}, {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} or an empty class.
 * @exports MeshBaseMixin
 * @param Base - the class to mix onto
 * @returns - the mixed classes, creating a basic Mesh.
 */
function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase {
  /**
   * MeshBase defines our base properties and methods
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
    /** {@link AllowedGeometries | Geometry} used by this {@link MeshBase} */
    geometry: MeshBaseParams['geometry']

    /** {@link RenderTarget} to render this Mesh to, if any */
    outputTarget: null | RenderTarget

    /** Controls the order in which this {@link MeshBase} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
    renderOrder: number
    /** Whether this {@link MeshBase} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} blend properties */
    transparent: boolean

    /** Flag indicating whether to draw this {@link MeshBase} or not */
    visible: boolean
    /** Flag indicating whether this {@link MeshBase} is ready to be drawn */
    _ready: boolean

    /** Empty object to store any additional data or custom properties into your {@link MeshBase}. */
    userData: Record<string, unknown>

    /** Whether we should add this {@link MeshBase} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    #autoRender = true

    // callbacks / events
    /** function assigned to the {@link onReady} callback */
    _onReadyCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onBeforeRender} callback */
    _onBeforeRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onRender} callback */
    _onRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onAfterRender} callback */
    _onAfterRenderCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onAfterResize} callback */
    _onAfterResizeCallback: () => void = () => {
      /* allow empty callback */
    }

    /**
     * MeshBase constructor
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(Renderer|GPUCurtains)} 0 - our {@link Renderer} class object
     * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
     * @property {MeshBaseParams} 2 - {@link MeshBaseParams | Mesh base parameters}
     *
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

      const {
        label,
        shaders,
        geometry,
        visible,
        renderOrder,
        outputTarget,
        texturesOptions,
        autoRender,
        ...meshParameters
      } = parameters

      this.outputTarget = outputTarget ?? null

      // set default sample count
      meshParameters.sampleCount = !!meshParameters.sampleCount
        ? meshParameters.sampleCount
        : this.outputTarget
        ? this.outputTarget.renderPass.options.sampleCount
        : this.renderer && this.renderer.renderPass
        ? this.renderer.renderPass.options.sampleCount
        : 1

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        label: label ?? 'Mesh ' + this.renderer.meshes.length,
        ...(shaders !== undefined ? { shaders } : {}),
        ...(outputTarget !== undefined && { outputTarget }),
        texturesOptions,
        ...(autoRender !== undefined && { autoRender }),
        ...meshParameters,
      }

      if (autoRender !== undefined) {
        this.#autoRender = autoRender
      }

      this.visible = visible
      this.renderOrder = renderOrder
      this.ready = false

      this.userData = {}

      if (geometry) {
        this.useGeometry(geometry)
      }

      // this.geometry = geometry
      // this.geometry.consumers.add(this.uuid)

      //this.computeGeometry()

      this.setMaterial({
        ...this.cleanupRenderMaterialParameters({ ...this.options }),
        ...(geometry && { verticesOrder: geometry.verticesOrder, topology: geometry.topology }),
      } as RenderMaterialParams)

      this.addToScene()
    }

    /**
     * Get private #autoRender value
     * @readonly
     */
    get autoRender(): boolean {
      return this.#autoRender
    }

    /**
     * Get/set whether a Mesh is ready or not
     * @readonly
     */
    get ready(): boolean {
      return this._ready
    }

    set ready(value: boolean) {
      if (value && !this._ready) {
        this._onReadyCallback && this._onReadyCallback()
      }
      this._ready = value
    }

    /* SCENE */

    /**
     * Add a Mesh to the renderer and the {@link core/scenes/Scene.Scene | Scene}. Can patch the {@link RenderMaterial} render options to match the {@link RenderPass} used to draw this Mesh.
     */
    addToScene() {
      this.renderer.meshes.push(this as unknown as SceneStackedMesh)

      this.setRenderingOptionsForRenderPass(this.outputTarget ? this.outputTarget.renderPass : this.renderer.renderPass)

      if (this.#autoRender) {
        this.renderer.scene.addMesh(this as unknown as SceneStackedMesh)
      }
    }

    /**
     * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (this.#autoRender) {
        this.renderer.scene.removeMesh(this as unknown as ProjectedMesh)
      }

      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
    }

    /**
     * Set a new {@link Renderer} for this Mesh
     * @param renderer - new {@link Renderer} to set
     */
    setRenderer(renderer: Renderer | GPUCurtains) {
      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

      if (
        !renderer ||
        !(
          renderer.type === 'GPURenderer' ||
          renderer.type === 'GPUCameraRenderer' ||
          renderer.type === 'GPUCurtainsRenderer'
        )
      ) {
        throwWarning(
          `${this.options.label}: Cannot set ${renderer} as a renderer because it is not of a valid Renderer type.`
        )
        return
      }

      const oldRenderer = this.renderer
      this.removeFromScene()
      this.renderer = renderer
      this.addToScene()

      // if old renderer does not contain any meshes any more
      // clear it
      if (!oldRenderer.meshes.length) {
        oldRenderer.onBeforeRenderScene.add(
          (commandEncoder) => {
            oldRenderer.forceClear(commandEncoder)
          },
          { once: true }
        )
      }
    }

    /**
     * Assign or remove a {@link RenderTarget} to this Mesh
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setOutputTarget(outputTarget: RenderTarget | null) {
      if (outputTarget && outputTarget.type !== 'RenderTarget') {
        throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget}`)
        return
      }

      // ensure the mesh is in the correct scene stack
      this.removeFromScene()
      this.outputTarget = outputTarget
      this.addToScene()
    }

    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
     */
    loseContext() {
      // we're obviously not ready anymore
      this.ready = false

      // first the geometry
      this.geometry.loseContext()

      // then the material
      this.material.loseContext()
    }

    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
     */
    restoreContext() {
      this.geometry.restoreContext(this.renderer)
      this.material.restoreContext()
    }

    /* SHADERS */

    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      const { shaders } = this.options

      if (!shaders) {
        this.options.shaders = {
          vertex: {
            code: default_vsWgsl,
            entryPoint: 'main',
          },
          fragment: {
            code: default_fsWgsl,
            entryPoint: 'main',
          },
        }
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: default_vsWgsl,
            entryPoint: 'main',
          }
        }

        if (shaders.fragment === undefined || (shaders.fragment && !(shaders.fragment as ShaderOptions).code)) {
          shaders.fragment = {
            code: default_fsWgsl,
            entryPoint: 'main',
          }
        }
      }
    }

    /* GEOMETRY */

    /**
     * Set or update the Mesh {@link Geometry}
     * @param geometry - new {@link Geometry} to use
     */
    useGeometry(geometry: Geometry) {
      if (this.geometry) {
        // compute right away to compare geometries
        if (geometry.shouldCompute) {
          geometry.computeGeometry()
        }

        if (this.geometry.wgslStructFragment !== geometry.wgslStructFragment) {
          throwError(
            `${this.options.label} (${this.type}): could not swap geometries because the current and given geometries do not have the same vertexBuffers layout.`
          )
        }

        this.geometry.consumers.delete(this.uuid)
      }

      this.geometry = geometry
      this.geometry.consumers.add(this.uuid)

      this.computeGeometry()

      if (this.material) {
        const renderingOptions = {
          ...this.material.options.rendering,
          ...{ verticesOrder: geometry.verticesOrder, topology: geometry.topology },
        }

        this.material.setRenderingOptions(renderingOptions)
      }
    }

    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry()
      }
    }

    /**
     * Set our Mesh geometry: create buffers and add attributes to material
     */
    setGeometry() {
      if (this.geometry) {
        if (!this.geometry.ready) {
          this.geometry.createBuffers({
            renderer: this.renderer,
            label: this.options.label + ' geometry',
          })
        }

        this.setMaterialGeometryAttributes()
      }
    }

    /* MATERIAL */

    /**
     * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
     * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
     */
    setRenderingOptionsForRenderPass(renderPass: RenderPass) {
      // a Mesh render material rendering options MUST match the render pass descriptor used to draw it!
      const renderingOptions = {
        // sample count
        sampleCount: renderPass.options.sampleCount,
        // color attachments
        ...(renderPass.options.colorAttachments.length && {
          targets: renderPass.options.colorAttachments.map((colorAttachment, index) => {
            return {
              // patch format...
              format: colorAttachment.targetFormat,
              // ...but keep original blend values if any
              ...(this.options.targets?.length &&
                this.options.targets[index] &&
                this.options.targets[index].blend && {
                  blend: this.options.targets[index].blend,
                }),
            }
          }),
        }),
        // depth
        depth: renderPass.options.useDepth,
        ...(renderPass.options.useDepth && {
          depthFormat: renderPass.options.depthFormat,
        }),
      }

      this.material?.setRenderingOptions(renderingOptions)
    }

    /**
     * Hook used to clean up parameters before sending them to the {@link RenderMaterial}.
     * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters: MeshBaseRenderParams): MeshBaseRenderParams {
      // patch and set options, return mesh parameters
      delete parameters.texturesOptions
      delete parameters.outputTarget
      delete parameters.autoRender

      return parameters
    }

    /**
     * Set or update the Mesh {@link RenderMaterial}
     * @param material - new {@link RenderMaterial} to use
     */
    useMaterial(material: RenderMaterial) {
      this.material = material

      // update transparent property
      this.transparent = this.material.options.rendering.transparent

      // add eventual textures passed as parameters
      this.material.options.textures
        ?.filter((texture) => texture instanceof Texture)
        .forEach((texture) => this.onTextureAdded(texture))
    }

    /**
     * Patch the shaders if needed, then set the Mesh material
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      this.setShaders()
      meshParameters.shaders = this.options.shaders

      this.useMaterial(new RenderMaterial(this.renderer, meshParameters))
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
     * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
     * @readonly
     */
    get textures(): Texture[] {
      return this.material?.textures || []
    }

    /**
     * Get our {@link RenderMaterial#renderTextures | RenderMaterial render textures array}
     * @readonly
     */
    get renderTextures(): RenderTexture[] {
      return this.material?.renderTextures || []
    }

    /**
     * Create a new {@link Texture}
     * @param options - {@link TextureParams | Texture parameters}
     * @returns - newly created {@link Texture}
     */
    createTexture(options: TextureParams): Texture {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      if (!options.label) {
        options.label = this.options.label + ' ' + options.name
      }

      const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions })

      this.addTexture(texture)

      return texture
    }

    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture) {
      this.material.addTexture(texture)
      this.onTextureAdded(texture)
    }

    /**
     * Callback run when a new {@link Texture} has been added
     * @param texture - newly created Texture
     */
    onTextureAdded(texture: Texture) {
      texture.parentMesh = this as unknown as TextureParent
    }

    /**
     * Create a new {@link RenderTexture}
     * @param  options - {@link RenderTextureParams | RenderTexture parameters}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture {
      if (!options.name) {
        options.name = 'renderTexture' + this.renderTextures.length
      }

      const renderTexture = new RenderTexture(this.renderer, options)

      this.addRenderTexture(renderTexture)

      return renderTexture
    }

    /**
     * Add a {@link RenderTexture}
     * @param renderTexture - {@link RenderTexture} to add
     */
    addRenderTexture(renderTexture: RenderTexture) {
      this.material.addTexture(renderTexture)
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

    /* RESIZE */

    /**
     * Resize the Mesh's textures
     * @param boundingRect
     */
    resize(boundingRect?: DOMElementBoundingRect | null) {
      // @ts-ignore
      if (super.resize) {
        // @ts-ignore
        super.resize(boundingRect)
      }

      this.renderTextures?.forEach((renderTexture) => {
        // copy from original textures again if needed
        if (renderTexture.options.fromTexture) {
          renderTexture.copy(renderTexture.options.fromTexture)
        }
      })

      // resize textures
      this.textures?.forEach((texture) => {
        texture.resize()
      })

      this._onAfterResizeCallback && this._onAfterResizeCallback()
    }

    /* EVENTS */

    /**
     * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
     * @param callback - callback to run when {@link MeshBase} is ready
     * @returns - our Mesh
     */
    onReady(callback: () => void): MeshBase | ProjectedMeshBaseClass {
      if (callback) {
        this._onReadyCallback = callback
      }

      return this
    }

    /**
     * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
     * @returns - our Mesh
     */
    onBeforeRender(callback: () => void): MeshBase | ProjectedMeshBaseClass {
      if (callback) {
        this._onBeforeRenderCallback = callback
      }

      return this
    }

    /**
     * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just before rendering the {@link MeshBase}
     * @returns - our Mesh
     */
    onRender(callback: () => void): MeshBase | ProjectedMeshBaseClass {
      if (callback) {
        this._onRenderCallback = callback
      }

      return this
    }

    /**
     * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just after {@link MeshBase} has been rendered
     * @returns - our Mesh
     */
    onAfterRender(callback: () => void): MeshBase | ProjectedMeshBaseClass {
      if (callback) {
        this._onAfterRenderCallback = callback
      }

      return this
    }

    /**
     * Callback to execute just after a Mesh has been resized.
     * @param callback - callback to run just after {@link MeshBase} has been resized
     * @returns - our Mesh
     */
    onAfterResize(callback: () => void): MeshBase | ProjectedMeshBaseClass {
      if (callback) {
        this._onAfterResizeCallback = callback
      }

      return this
    }

    /* RENDER */

    /**
     * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
     */
    onBeforeRenderScene() {
      if (!this.renderer.ready || !this.ready || !this.visible) return

      this._onBeforeRenderCallback && this._onBeforeRenderCallback()
    }

    /**
     * Called before rendering the Mesh
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      this.ready = this.material && this.material.ready && this.geometry && this.geometry.ready

      this.setGeometry()

      this.material.onBeforeRender()
    }

    /**
     * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
     * @param pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      if (!this.ready) return

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
     * - Execute {@link onBeforeRenderPass}
     * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}
     * - Execute super render call if it exists
     * - {@link onRenderPass | render} our {@link material} and {@link geometry}
     * - Execute {@link onAfterRenderPass}
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

      !this.renderer.production && pass.pushDebugGroup(this.options.label)

      this.onRenderPass(pass)

      !this.renderer.production && pass.popDebugGroup()

      this.onAfterRenderPass()
    }

    /* DESTROY */

    /**
     * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
     */
    remove() {
      this.removeFromScene()
      this.destroy()

      // if the renderer does not contain any meshes any more
      // clear it
      if (!this.renderer.meshes.length) {
        this.renderer.onBeforeRenderScene.add(
          (commandEncoder) => {
            this.renderer.forceClear(commandEncoder)
          },
          { once: true }
        )
      }
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

      this.material?.destroy()

      // destroy geometry and remove buffers from device cache
      this.geometry.consumers.delete(this.uuid)
      if (!this.geometry.consumers.size) {
        this.geometry?.destroy(this.renderer)
      }
    }
  }
}

export { MeshBaseMixin }
