import { Material } from './Material.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { throwWarning } from '../../utils/utils.mjs';

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
    super(renderer, parameters);
    this.type = type;
    this.renderer = renderer;
    const { shaders, label, useAsyncPipeline, uniforms, storages, bindGroups, ...renderingOptions } = parameters;
    if (!shaders.vertex.entryPoint) {
      shaders.vertex.entryPoint = "main";
    }
    if (shaders.fragment && !shaders.fragment.entryPoint) {
      shaders.fragment.entryPoint = "main";
    }
    renderingOptions.targetFormat = renderingOptions.targetFormat ?? this.renderer.options.preferredFormat;
    this.options = {
      ...this.options,
      shaders,
      rendering: renderingOptions
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
    const newProperties = Object.keys(renderingOptions).filter(
      (key) => renderingOptions[key] !== this.options.rendering[key]
    );
    this.options.rendering = { ...this.options.rendering, ...renderingOptions };
    if (this.pipelineEntry) {
      this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering };
      if (this.pipelineEntry.ready && newProperties.length) {
        throwWarning(
          `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be flushed and recompiled. This should be avoided. Rendering options that caused this: { ${newProperties.map(
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
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex);
        bindGroup.createBindGroup();
        this.bindGroups.push(bindGroup);
      }
    });
  }
}

export { RenderMaterial };
