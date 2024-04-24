import { Material } from './Material.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { compareRenderingOptions } from './utils.mjs';
import default_projected_vsWgsl from '../shaders/chunks/default_projected_vs.wgsl.mjs';
import default_vsWgsl from '../shaders/chunks/default_vs.wgsl.mjs';
import default_fsWgsl from '../shaders/chunks/default_fs.wgsl.mjs';

class RenderMaterial extends Material {
  /**
   * RenderMaterial constructor
   * @param renderer - our renderer class object
   * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
   */
  constructor(renderer, parameters) {
    renderer = renderer && renderer.renderer || renderer;
    const type = "RenderMaterial";
    isRenderer(renderer, type);
    if (!parameters.shaders) {
      parameters.shaders = {};
    }
    if (!parameters.shaders?.vertex) {
      parameters.shaders.vertex = {
        code: parameters.useProjection ? default_projected_vsWgsl : default_vsWgsl,
        entryPoint: "main"
      };
    }
    if (!parameters.shaders.vertex.entryPoint) {
      parameters.shaders.vertex.entryPoint = "main";
    }
    if (parameters.shaders.fragment === void 0) {
      parameters.shaders.fragment = {
        entryPoint: "main",
        code: default_fsWgsl
      };
    }
    super(renderer, parameters);
    this.type = type;
    this.renderer = renderer;
    const { shaders } = parameters;
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
      topology
    } = parameters;
    let { targets } = parameters;
    if (!targets || !targets.length) {
      targets = [
        {
          format: this.renderer.options.preferredFormat
        }
      ];
    }
    if (!targets[0].format) {
      targets[0].format = this.renderer.options.preferredFormat;
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
        topology
      }
    };
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      renderer: this.renderer,
      label: this.options.label + " render pipeline",
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      rendering: this.options.rendering
    });
    this.attributes = null;
  }
  /**
   * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry}
   */
  setPipelineEntryProperties() {
    this.pipelineEntry.setPipelineEntryProperties({
      attributes: this.attributes,
      bindGroups: this.bindGroups
    });
  }
  /**
   * Compile the {@link RenderPipelineEntry}
   * @async
   */
  async compilePipelineEntry() {
    await this.pipelineEntry.compilePipelineEntry();
  }
  /**
   * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers and compile the pipeline
   * @async
   */
  async compileMaterial() {
    super.compileMaterial();
    if (this.attributes && this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryProperties();
      await this.compilePipelineEntry();
    }
  }
  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
   */
  setRenderingOptions(renderingOptions = {}) {
    const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering);
    this.options.rendering = { ...this.options.rendering, ...renderingOptions };
    if (this.pipelineEntry) {
      this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering };
      if (this.pipelineEntry.ready && newProperties.length) {
        throwWarning(
          `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be flushed and recompiled. This should be avoided. Rendering options responsible: { ${newProperties.map(
            (key) => `"${key}": ${Array.isArray(renderingOptions[key]) ? renderingOptions[key].map((optKey) => `${JSON.stringify(optKey)}`).join(", ") : renderingOptions[key]}`
          ).join(", ")} }`
        );
        this.pipelineEntry.flushPipelineEntry(this.bindGroups);
      }
    }
  }
  /* ATTRIBUTES */
  /**
   * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
   * @param geometry - the geometry to draw
   */
  setAttributesFromGeometry(geometry) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexBuffers: geometry.vertexBuffers
    };
  }
  /* BIND GROUPS */
  /**
   * Create the bind groups if they need to be created, but first add Camera bind group if needed
   */
  createBindGroups() {
    const bindGroupStartIndex = this.options.rendering.useProjection ? 1 : 0;
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex);
      this.texturesBindGroup.createBindGroup();
      this.bindGroups.push(this.texturesBindGroup);
    }
    for (const bindGroup of this.inputsBindGroups) {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex);
        bindGroup.createBindGroup();
        this.bindGroups.push(bindGroup);
      }
    }
  }
}

export { RenderMaterial };
