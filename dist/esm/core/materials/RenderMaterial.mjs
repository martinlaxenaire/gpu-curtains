import { Material } from './Material.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { compareRenderingOptions } from './utils.mjs';
import default_projected_vsWgsl from '../shaders/chunks/default/default_projected_vs.wgsl.mjs';
import default_vsWgsl from '../shaders/chunks/default/default_vs.wgsl.mjs';
import default_fsWgsl from '../shaders/chunks/default/default_fs.wgsl.mjs';

class RenderMaterial extends Material {
  /**
   * RenderMaterial constructor
   * @param renderer - our renderer class object
   * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
   */
  constructor(renderer, parameters) {
    const type = "RenderMaterial";
    renderer = isRenderer(renderer, type);
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
    if (targets === void 0) {
      targets = [
        {
          format: this.renderer.options.preferredFormat
        }
      ];
    }
    if (targets && targets.length && !targets[0].format) {
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
    this.attributes = null;
    this.pipelineEntry = null;
  }
  /**
   * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
   */
  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      renderer: this.renderer,
      label: this.options.label + " render pipeline",
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      rendering: this.options.rendering,
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
   * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
   * @async
   */
  async compileMaterial() {
    if (this.ready)
      return;
    super.compileMaterial();
    if (this.attributes && !this.pipelineEntry) {
      this.setPipelineEntry();
    }
    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry();
    }
  }
  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
   */
  setRenderingOptions(renderingOptions = {}) {
    const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering);
    const oldRenderingOptions = { ...this.options.rendering };
    this.options.rendering = { ...this.options.rendering, ...renderingOptions };
    if (this.pipelineEntry) {
      if (this.pipelineEntry.ready && newProperties.length) {
        if (!this.renderer.production) {
          const oldProps = newProperties.map((key) => {
            return {
              [key]: Array.isArray(oldRenderingOptions[key]) ? oldRenderingOptions[key].map((optKey) => optKey) : oldRenderingOptions[key]
            };
          });
          const newProps = newProperties.map((key) => {
            return {
              [key]: Array.isArray(renderingOptions[key]) ? renderingOptions[key].map((optKey) => optKey) : renderingOptions[key]
            };
          });
          throwWarning(
            `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be recompiled. This should be avoided.

Old rendering options: ${JSON.stringify(
              oldProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}

--------

New rendering options: ${JSON.stringify(
              newProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}`
          );
        }
        this.setPipelineEntry();
      } else {
        this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering };
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
      vertexBuffers: geometry.vertexBuffers,
      layoutCacheKey: geometry.layoutCacheKey
    };
  }
  /* BIND GROUPS */
  /**
   * Get whether this {@link RenderMaterial} uses the renderer camera and lights bind group.
   * @readonly
   * */
  get useCameraBindGroup() {
    return "cameraLightsBindGroup" in this.renderer && this.options.rendering.useProjection;
  }
  /**
   * Create the bind groups if they need to be created, but first add camera and lights bind group if needed.
   */
  createBindGroups() {
    if (this.useCameraBindGroup) {
      this.bindGroups.push(this.renderer.cameraLightsBindGroup);
      this.renderer.cameraLightsBindGroup.consumers.add(this.uuid);
    }
    super.createBindGroups();
  }
  /**
   * Update all bind groups, except for the camera and light bind groups if present, as it is already updated by the renderer itself.
   */
  updateBindGroups() {
    const startBindGroupIndex = this.useCameraBindGroup ? 1 : 0;
    for (let i = startBindGroupIndex; i < this.bindGroups.length; i++) {
      this.updateBindGroup(this.bindGroups[i]);
    }
  }
}

export { RenderMaterial };
