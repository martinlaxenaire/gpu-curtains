import { Material } from './Material'
import { isRenderer, Renderer, CameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import {
  AllowedGeometries,
  RenderMaterialAttributes,
  RenderMaterialOptions,
  RenderMaterialParams,
  RenderMaterialRenderingOptions,
  ShaderOptions,
} from '../../types/Materials'
import { RenderPipelineEntry } from '../pipelines/RenderPipelineEntry'
import { throwWarning } from '../../utils/utils'
import { compareRenderingOptions } from './utils'
import default_projected_vsWgsl from '../shaders/chunks/default/default_projected_vs.wgsl'
import default_vsWgsl from '../shaders/chunks/default/default_vs.wgsl'
import default_fsWgsl from '../shaders/chunks/default/default_fs.wgsl'

/**
 * Create a {@link Material} specifically built to draw the vertices of a {@link core/geometries/Geometry.Geometry | Geometry}. Internally used by all kind of Meshes.
 *
 * ## Render pipeline
 *
 * A {@link RenderMaterial} automatically creates a {@link RenderPipelineEntry}. Once all the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} have been created, they are sent with the shaders code and the {@link RenderMaterialOptions#rendering | rendering options} to the {@link RenderPipelineEntry}, which is in turns responsible for creating the {@link GPURenderPipeline}.
 *
 * After the {@link GPURenderPipeline} has been successfully compiled, the {@link RenderMaterial} is considered to be ready.
 */
export class RenderMaterial extends Material {
  /** {@link RenderPipelineEntry | Render pipeline entry} used by this {@link RenderMaterial} */
  pipelineEntry: RenderPipelineEntry | null
  /** Mandatory {@link RenderMaterialAttributes | geometry attributes} to pass to the {@link RenderPipelineEntry | render pipeline entry} */
  attributes: RenderMaterialAttributes | null
  /** Options used to create this {@link RenderMaterial} */
  options: RenderMaterialOptions

  /**
   * RenderMaterial constructor
   * @param renderer - our renderer class object
   * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams) {
    const type = 'RenderMaterial'

    renderer = isRenderer(renderer, type)

    if (!parameters.shaders) {
      parameters.shaders = {}
    }

    if (!parameters.shaders?.vertex) {
      parameters.shaders.vertex = {
        code: parameters.useProjection ? default_projected_vsWgsl : default_vsWgsl,
        entryPoint: 'main',
      }
    }

    if (!parameters.shaders.vertex.entryPoint) {
      parameters.shaders.vertex.entryPoint = 'main'
    }

    if (parameters.shaders.fragment === undefined) {
      ;(parameters.shaders.fragment as ShaderOptions) = {
        entryPoint: 'main',
        code: default_fsWgsl,
      }
    }

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    const { shaders } = parameters

    // rendering options
    const {
      useProjection,
      transparent,
      depth,
      depthWriteEnabled,
      depthCompare,
      depthFormat,
      cullMode,
      sampleCount,
      verticesOrder,
      topology,
    } = parameters

    let { targets } = parameters

    // patch default target format if not set
    if (targets === undefined) {
      targets = [
        {
          format: this.renderer.options.preferredFormat,
        },
      ]
    }
    if (targets && targets.length && !targets[0].format) {
      targets[0].format = this.renderer.options.preferredFormat
    }

    this.options = {
      ...this.options,
      shaders,
      rendering: {
        useProjection,
        transparent,
        depth,
        depthWriteEnabled,
        depthCompare,
        depthFormat,
        cullMode,
        sampleCount,
        targets,
        verticesOrder,
        topology,
      },
    } as RenderMaterialOptions

    this.attributes = null
    // will be set at render if needed
    this.pipelineEntry = null
  }

  /**
   * Set or reset this {@link RenderMaterial} {@link renderer}. Will also update the renderer camera bind group if needed.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    // remove old camera bind group
    if (this.useCameraBindGroup && this.renderer) {
      ;(this.renderer as CameraRenderer).cameraLightsBindGroup.consumers.delete(this.uuid)
    }

    super.setRenderer(renderer)

    // update new camera bind group
    if (this.useCameraBindGroup) {
      this.bindGroups[0] = (this.renderer as CameraRenderer).cameraLightsBindGroup
      ;(this.renderer as CameraRenderer).cameraLightsBindGroup.consumers.add(this.uuid)
    }
  }

  /**
   * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
   */
  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      renderer: this.renderer,
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      rendering: this.options.rendering,
      attributes: this.attributes,
      bindGroups: this.bindGroups,
    })
  }

  /**
   * Compile the {@link RenderPipelineEntry}
   * @async
   */
  async compilePipelineEntry(): Promise<void> {
    await this.pipelineEntry.compilePipelineEntry()
  }

  /**
   * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
   * @async
   */
  async compileMaterial(): Promise<void> {
    if (this.ready) return

    super.compileMaterial()

    if (this.attributes && !this.pipelineEntry) {
      this.setPipelineEntry()
    }

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry()
    }
  }

  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
   */
  setRenderingOptions(renderingOptions: Partial<RenderMaterialRenderingOptions> = {}) {
    // patch original transparent blending if it had been lost
    if (renderingOptions.transparent && renderingOptions.targets.length && !renderingOptions.targets[0].blend) {
      renderingOptions.targets[0].blend = RenderPipelineEntry.getDefaultTransparentBlending()
    }

    const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering)

    const oldRenderingOptions = { ...this.options.rendering }

    // apply new options
    this.options.rendering = { ...this.options.rendering, ...renderingOptions }

    if (this.pipelineEntry) {
      if (this.pipelineEntry.ready && newProperties.length) {
        if (!this.renderer.production) {
          const oldProps = newProperties.map((key) => {
            return {
              [key]: Array.isArray(oldRenderingOptions[key])
                ? (oldRenderingOptions[key] as []).map((optKey) => optKey)
                : oldRenderingOptions[key],
            }
          })

          const newProps = newProperties.map((key) => {
            return {
              [key]: Array.isArray(renderingOptions[key])
                ? (renderingOptions[key] as []).map((optKey) => optKey)
                : renderingOptions[key],
            }
          })

          throwWarning(
            `${
              this.options.label
            }: the change of rendering options is causing this RenderMaterial pipeline to be recompiled. This should be avoided.\n\nOld rendering options: ${JSON.stringify(
              oldProps.reduce((acc, v) => {
                return { ...acc, ...v }
              }, {}),
              null,
              4
            )}\n\n--------\n\nNew rendering options: ${JSON.stringify(
              newProps.reduce((acc, v) => {
                return { ...acc, ...v }
              }, {}),
              null,
              4
            )}`
          )
        }

        // recreate the pipeline entry totally
        // if we're lucky we might get one from the cache
        this.setPipelineEntry()
      } else {
        this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering }
      }
    }
  }

  /* ATTRIBUTES */

  /**
   * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
   * @param geometry - the geometry to draw
   */
  setAttributesFromGeometry(geometry: AllowedGeometries) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexBuffers: geometry.vertexBuffers,
      layoutCacheKey: geometry.layoutCacheKey,
    }
  }

  /* BIND GROUPS */

  /**
   * Get whether this {@link RenderMaterial} uses the renderer camera and lights bind group.
   * @readonly
   * */
  get useCameraBindGroup(): boolean {
    return 'cameraLightsBindGroup' in this.renderer && this.options.rendering.useProjection
  }

  /**
   * Create the bind groups if they need to be created, but first add camera and lights bind group if needed.
   */
  createBindGroups() {
    // camera and lights first!
    if (this.useCameraBindGroup) {
      this.bindGroups.push((this.renderer as CameraRenderer).cameraLightsBindGroup)
      ;(this.renderer as CameraRenderer).cameraLightsBindGroup.consumers.add(this.uuid)
    }

    super.createBindGroups()
  }

  /**
   * Update all bind groups, except for the camera and light bind groups if present, as it is already updated by the renderer itself.
   */
  updateBindGroups() {
    const startBindGroupIndex = this.useCameraBindGroup ? 1 : 0
    for (let i = startBindGroupIndex; i < this.bindGroups.length; i++) {
      this.updateBindGroup(this.bindGroups[i])
    }
  }
}
