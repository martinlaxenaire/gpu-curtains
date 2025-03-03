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
import { getDefaultProjectedVertexShaderCode } from '../shaders/full/vertex/get-default-projected-vertex-shader-code'
import { getDefaultVertexShaderCode } from '../shaders/full/vertex/get-default-vertex-shader-code'
import { getDefaultFragmentCode } from '../shaders/full/fragment/get-default-fragment-code'

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
  /** {@link RenderPipelineEntry | Render pipeline entry} used by this {@link RenderMaterial}. */
  pipelineEntry: RenderPipelineEntry | null
  /** Mandatory {@link RenderMaterialAttributes | geometry attributes} to pass to the {@link RenderPipelineEntry | render pipeline entry}. */
  attributes: RenderMaterialAttributes | null
  /** Options used to create this {@link RenderMaterial}. */
  options: RenderMaterialOptions

  /**
   * RenderMaterial constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link RenderMaterial}.
   * @param parameters - {@link RenderMaterialParams} used to create our {@link RenderMaterial}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams) {
    const type = 'RenderMaterial'

    renderer = isRenderer(renderer, type)

    if (!parameters.shaders) {
      parameters.shaders = {}
    }

    if (!parameters.shaders?.vertex) {
      parameters.shaders.vertex = {
        code: parameters.useProjection ? getDefaultProjectedVertexShaderCode : getDefaultVertexShaderCode,
        entryPoint: 'main',
      }
    }

    if (!parameters.shaders.vertex.entryPoint) {
      parameters.shaders.vertex.entryPoint = 'main'
    }

    if (parameters.shaders.fragment === undefined) {
      ;(parameters.shaders.fragment as ShaderOptions) = {
        entryPoint: 'main',
        code: getDefaultFragmentCode,
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
      // depth stencil
      depth,
      depthWriteEnabled,
      depthCompare,
      depthFormat,
      depthBias,
      depthBiasClamp,
      depthBiasSlopeScale,
      stencil,
      // multisample
      sampleCount,
      alphaToCoverageEnabled,
      mask,
      // primitive
      cullMode,
      verticesOrder,
      topology,
      unclippedDepth,
    } = parameters

    // targets
    let { targets } = parameters

    // patch default target format if not set
    if (targets === undefined) {
      targets = [
        {
          format: this.renderer.options.context.format,
        },
      ]
    }
    if (targets && targets.length && !targets[0].format) {
      targets[0].format = this.renderer.options.context.format
    }

    // patch stencil options for a better pipeline cache
    if (stencil) {
      if (!stencil.front) {
        stencil.front = {}
      }

      if (stencil.front && !stencil.back) {
        stencil.back = stencil.front
      }

      if (!stencil.stencilReference) {
        stencil.stencilReference = 0x000000
      }

      if (!stencil.stencilReadMask) {
        stencil.stencilReadMask = 0xffffff
      }

      if (!stencil.stencilWriteMask) {
        stencil.stencilWriteMask = 0xffffff
      }
    }

    this.options = {
      ...this.options,
      shaders,
      rendering: {
        useProjection,
        transparent,
        // depth stencil
        depth,
        depthWriteEnabled,
        depthCompare,
        depthFormat,
        depthBias: depthBias !== undefined ? depthBias : 0,
        depthBiasClamp: depthBiasClamp !== undefined ? depthBiasClamp : 0,
        depthBiasSlopeScale: depthBiasSlopeScale !== undefined ? depthBiasSlopeScale : 0,
        ...(stencil && { stencil }),
        // multisample
        sampleCount,
        alphaToCoverageEnabled: !!alphaToCoverageEnabled,
        mask: mask !== undefined ? mask : 0xffffff,
        // targets
        targets,
        // primitive
        cullMode,
        verticesOrder,
        topology,
        unclippedDepth: !!unclippedDepth,
      },
    } as RenderMaterialOptions

    this.attributes = null
    // will be set at render if needed
    this.pipelineEntry = null
  }

  /**
   * Set or reset this {@link RenderMaterial} {@link RenderMaterial.renderer | renderer}. Will also update the renderer camera bind group if needed.
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
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline(this)
  }

  /**
   * Compile the {@link RenderPipelineEntry}.
   */
  async compilePipelineEntry(): Promise<void> {
    await this.pipelineEntry.compilePipelineEntry()
  }

  /**
   * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
   */
  async compileMaterial(): Promise<void> {
    if (this.ready) return

    await super.compileMaterial()

    if (this.attributes && !this.pipelineEntry) {
      this.setPipelineEntry()
    }

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry()
    }
  }

  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - New {@link RenderMaterialRenderingOptions | rendering options} properties to be set.
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
   * Get all useful {@link core/geometries/Geometry.Geometry | Geometry} properties needed to create attributes buffers.
   * @param geometry - The geometry to draw.
   */
  setAttributesFromGeometry(geometry: AllowedGeometries) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexBuffers: geometry.vertexBuffers,
      layoutCacheKey: geometry.layoutCacheKey,
    }

    if ('indexBuffer' in geometry && geometry.indexBuffer && geometry.topology.includes('strip')) {
      //this.options.rendering.stripIndexFormat = geometry.indexBuffer.bufferFormat
      this.setRenderingOptions({
        ...this.options.rendering,
        stripIndexFormat: geometry.indexBuffer.bufferFormat,
      })
    }
  }

  /**
   * Get the {@link RenderMaterial} pipeline buffers cache key based on its {@link core/bindGroups/BindGroup.BindGroup | BindGroup} cache keys and eventually {@link attributes} cache keys.
   * @returns - Current cache key.
   * @readonly
   */
  get cacheKey(): string {
    let cacheKey = this.attributes?.layoutCacheKey || ''
    return cacheKey + super.cacheKey
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

    if (this.useCameraBindGroup && this.bindGroups.length) {
      if (this.bindGroups[0].needsPipelineFlush && this.pipelineEntry.ready) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups)
      }
    }

    for (let i = startBindGroupIndex; i < this.bindGroups.length; i++) {
      this.updateBindGroup(this.bindGroups[i])
    }
  }

  /**
   * Render the material if it is ready. Call super, and the set the pass encoder stencil reference if needed.
   * @param pass - Current pass encoder.
   */
  render(pass: GPURenderPassEncoder | GPURenderBundleEncoder) {
    if (!this.ready) return

    super.render(pass)

    if (this.options.rendering.stencil) {
      ;(pass as GPURenderPassEncoder).setStencilReference(this.options.rendering.stencil.stencilReference ?? 0x000000)
    }
  }
}
