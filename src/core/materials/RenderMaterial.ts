import { Material } from './Material'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { CameraRenderer, isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import {
  AllowedGeometries,
  MaterialOptions,
  RenderMaterialAttributes,
  RenderMaterialParams,
} from '../../types/Materials'
import { RenderPipelineEntryBaseParams } from '../../types/core/pipelines/RenderPipelineEntry'

/**
 * RenderMaterial class:
 * Create a Material specifically built to draw vertices
 * @extends Material
 */
export class RenderMaterial extends Material {
  attributes: RenderMaterialAttributes | null

  /**
   * RenderMaterial constructor
   * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
   * @param {MaterialParams} parameters - parameters used to create our Material
   * @param {string} parameters.label - RenderMaterial label
   * @param {AllowedGeometries} parameters.geometry - geometry to draw
   * @param {boolean} parameters.useAsyncPipeline - whether the {@see RenderPipelineEntry} should be compiled asynchronously
   * @param {MaterialShaders} parameters.shaders - our RenderMaterial shader codes and entry points
   * @param {BindGroupInputs} parameters.inputs - our RenderMaterial {@see BindGroup} inputs
   * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
   * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
   * @param {RenderMaterialRenderingOptions} parameters.rendering - RenderMaterial rendering options to pass to the {@see RenderPipelineEntry}
   * @param {boolean} parameters.rendering.useProjection - whether to use the Camera bind group with this material
   * @param {boolean} parameters.rendering.transparent - impacts the {@see RenderPipelineEntry} blend properties
   * @param {boolean} parameters.rendering.depthWriteEnabled - whether to write to the depth buffer or not
   * @param {GPUCompareFunction} parameters.rendering.depthCompare - depth compare function to use
   * @param {GPUCullMode} parameters.rendering.cullMode - cull mode to use
   * @param {Geometry["verticesOrder"]} parameters.rendering.verticesOrder - vertices order to use
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'RenderMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    const { shaders, label, useAsyncPipeline, inputs, bindGroups, ...renderingOptions } = parameters

    if (!shaders.vertex.entryPoint) {
      shaders.vertex.entryPoint = 'main'
    }

    if (!shaders.fragment.entryPoint) {
      shaders.fragment.entryPoint = 'main'
    }

    this.options = {
      ...this.options,
      shaders,
      label,
      ...(useAsyncPipeline !== undefined && { useAsyncPipeline }),
      ...(inputs !== undefined && { inputs }),
      ...(bindGroups !== undefined && { bindGroups }),
      rendering: renderingOptions,
    } as MaterialOptions

    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      ...this.options.rendering,
    } as RenderPipelineEntryBaseParams)

    this.attributes = null
  }

  /**
   * When all bind groups and attributes are created, add them to the {@see ComputePipelineEntry} and compile it
   */
  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      attributes: this.attributes,
      bindGroups: this.bindGroups,
    })
  }

  /**
   * Create the attributes buffers, check if all bind groups are ready, create them if needed and set {@see RenderPipelineEntry} bind group buffers
   */
  setMaterial() {
    super.setMaterial()

    if (this.attributes && this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryBuffers()
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
    // }
    //
    // super.createBindGroups()

    // TODO!
    // need to chose whether we should add the camera bind group here
    // in such case we need to find a way not to bind it inside the render call
    // because it is already bound by the scene class at each render to avoid extra WebGPU commands
    const bindGroupStartIndex = this.options.rendering.useProjection ? 1 : 0

    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex) // bindGroup 0 is our renderer camera
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    // then uniforms
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }
}
