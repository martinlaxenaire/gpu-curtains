import { Material } from './Material'
import { isRenderer, Renderer } from '../renderers/utils'
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
  pipelineEntry: RenderPipelineEntry
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
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'RenderMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    const { shaders } = parameters

    if (!shaders.vertex.entryPoint) {
      shaders.vertex.entryPoint = 'main'
    }

    if (shaders.fragment && !(shaders.fragment as ShaderOptions).entryPoint) {
      ;(shaders.fragment as ShaderOptions).entryPoint = 'main'
    }

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
    if (!targets || !targets.length) {
      targets = [
        {
          format: this.renderer.options.preferredFormat,
        },
      ]
    }
    if (!targets[0].format) {
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

    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      renderer: this.renderer,
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      rendering: this.options.rendering,
    })

    this.attributes = null
  }

  /**
   * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry}
   */
  setPipelineEntryProperties() {
    this.pipelineEntry.setPipelineEntryProperties({
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
   * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers and compile the pipeline
   * @async
   */
  async compileMaterial() {
    super.compileMaterial()

    if (this.attributes && this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryProperties()
      await this.compilePipelineEntry()
    }
  }

  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
   */
  setRenderingOptions(renderingOptions: Partial<RenderMaterialRenderingOptions> = {}) {
    const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering)

    this.options.rendering = { ...this.options.rendering, ...renderingOptions }

    if (this.pipelineEntry) {
      this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering }

      if (this.pipelineEntry.ready && newProperties.length) {
        throwWarning(
          `${
            this.options.label
          }: the change of rendering options is causing this RenderMaterial pipeline to be flushed and recompiled. This should be avoided. Rendering options responsible: { ${newProperties
            .map(
              (key) =>
                `"${key}": ${
                  Array.isArray(renderingOptions[key])
                    ? (renderingOptions[key] as []).map((optKey) => `${JSON.stringify(optKey)}`).join(', ')
                    : renderingOptions[key]
                }`
            )
            .join(', ')} }`
        )

        this.pipelineEntry.flushPipelineEntry(this.bindGroups)
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
    }
  }

  /* BIND GROUPS */

  /**
   * Create the bind groups if they need to be created, but first add Camera bind group if needed
   */
  createBindGroups() {
    // camera first!
    // if ((this.renderer as CameraRenderer).cameraBindGroup && this.options.rendering.useProjection) {
    //   this.bindGroups.push((this.renderer as CameraRenderer).cameraBindGroup)
    //   (this.renderer as CameraRenderer).cameraBindGroup.addConsumer(this.uuid)
    // }
    //
    // super.createBindGroups()

    // TODO! need to chose whether we should add the camera bind group here
    // in such case we need to find a way not to bind it inside the render call
    // because it is already bound by the scene class at each render to avoid extra WebGPU commands
    const bindGroupStartIndex = this.options.rendering.useProjection ? 1 : 0

    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex) // bindGroup 0 is our renderer camera
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
      this.texturesBindGroup.consumers.add(this.uuid)
    }

    // then uniforms
    for (const bindGroup of this.inputsBindGroups) {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
        bindGroup.consumers.add(this.uuid)
      }
    }
  }
}
