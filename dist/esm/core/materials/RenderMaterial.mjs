import { Material } from './Material.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { RenderPipelineEntry } from '../pipelines/RenderPipelineEntry.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { compareRenderingOptions } from './utils.mjs';
import { getDefaultProjectedVertexShaderCode } from '../shaders/full/vertex/get-default-projected-vertex-shader-code.mjs';
import { getDefaultVertexShaderCode } from '../shaders/full/vertex/get-default-vertex-shader-code.mjs';
import { getDefaultFragmentCode } from '../shaders/full/fragment/get-default-fragment-code.mjs';

class RenderMaterial extends Material {
  /**
   * RenderMaterial constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link RenderMaterial}.
   * @param parameters - {@link RenderMaterialParams} used to create our {@link RenderMaterial}.
   */
  constructor(renderer, parameters) {
    const type = "RenderMaterial";
    renderer = isRenderer(renderer, type);
    if (!parameters.shaders) {
      parameters.shaders = {};
    }
    if (!parameters.shaders?.vertex) {
      parameters.shaders.vertex = {
        code: parameters.useProjection ? getDefaultProjectedVertexShaderCode : getDefaultVertexShaderCode,
        entryPoint: "main"
      };
    }
    if (!parameters.shaders.vertex.entryPoint) {
      parameters.shaders.vertex.entryPoint = "main";
    }
    if (parameters.shaders.fragment === void 0) {
      parameters.shaders.fragment = {
        entryPoint: "main",
        code: getDefaultFragmentCode
      };
    }
    super(renderer, parameters);
    this.type = type;
    this.renderer = renderer;
    const { shaders } = parameters;
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
      unclippedDepth
    } = parameters;
    let { targets } = parameters;
    if (targets === void 0) {
      targets = [
        {
          format: this.renderer.options.context.format
        }
      ];
    }
    if (targets && targets.length && !targets[0].format) {
      targets[0].format = this.renderer.options.context.format;
    }
    if (stencil) {
      if (!stencil.front) {
        stencil.front = {};
      }
      if (stencil.front && !stencil.back) {
        stencil.back = stencil.front;
      }
      if (!stencil.stencilReference) {
        stencil.stencilReference = 0;
      }
      if (!stencil.stencilReadMask) {
        stencil.stencilReadMask = 16777215;
      }
      if (!stencil.stencilWriteMask) {
        stencil.stencilWriteMask = 16777215;
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
        depthBias: depthBias !== void 0 ? depthBias : 0,
        depthBiasClamp: depthBiasClamp !== void 0 ? depthBiasClamp : 0,
        depthBiasSlopeScale: depthBiasSlopeScale !== void 0 ? depthBiasSlopeScale : 0,
        ...stencil && { stencil },
        // multisample
        sampleCount,
        alphaToCoverageEnabled: !!alphaToCoverageEnabled,
        mask: mask !== void 0 ? mask : 16777215,
        // targets
        targets,
        // primitive
        cullMode,
        verticesOrder,
        topology,
        unclippedDepth: !!unclippedDepth
      }
    };
    this.attributes = null;
    this.pipelineEntry = null;
  }
  /**
   * Set or reset this {@link RenderMaterial} {@link RenderMaterial.renderer | renderer}. Will also update the renderer camera bind group if needed.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.useCameraBindGroup && this.renderer) {
      this.renderer.cameraLightsBindGroup.consumers.delete(this.uuid);
    }
    super.setRenderer(renderer);
    if (this.useCameraBindGroup) {
      this.bindGroups[0] = this.renderer.cameraLightsBindGroup;
      this.renderer.cameraLightsBindGroup.consumers.add(this.uuid);
    }
  }
  /**
   * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
   */
  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline(this);
  }
  /**
   * Compile the {@link RenderPipelineEntry}.
   */
  async compilePipelineEntry() {
    await this.pipelineEntry.compilePipelineEntry();
  }
  /**
   * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
   */
  async compileMaterial() {
    if (this.ready) return;
    await super.compileMaterial();
    if (this.attributes && !this.pipelineEntry) {
      this.setPipelineEntry();
    }
    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry();
    }
  }
  /**
   * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
   * @param renderingOptions - New {@link RenderMaterialRenderingOptions | rendering options} properties to be set.
   */
  setRenderingOptions(renderingOptions = {}) {
    if (renderingOptions.transparent && renderingOptions.targets.length && !renderingOptions.targets[0].blend) {
      renderingOptions.targets[0].blend = RenderPipelineEntry.getDefaultTransparentBlending();
    }
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
   * Get all useful {@link core/geometries/Geometry.Geometry | Geometry} properties needed to create attributes buffers.
   * @param geometry - The geometry to draw.
   */
  setAttributesFromGeometry(geometry) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexBuffers: geometry.vertexBuffers,
      layoutCacheKey: geometry.layoutCacheKey
    };
    if ("indexBuffer" in geometry && geometry.indexBuffer && geometry.topology.includes("strip")) {
      this.setRenderingOptions({
        ...this.options.rendering,
        stripIndexFormat: geometry.indexBuffer.bufferFormat
      });
    }
  }
  /**
   * Get the {@link RenderMaterial} pipeline buffers cache key based on its {@link core/bindGroups/BindGroup.BindGroup | BindGroup} cache keys and eventually {@link attributes} cache keys.
   * @returns - Current cache key.
   * @readonly
   */
  get cacheKey() {
    let cacheKey = this.attributes?.layoutCacheKey || "";
    return cacheKey + super.cacheKey;
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
    if (this.useCameraBindGroup && this.bindGroups.length) {
      if (this.bindGroups[0].needsPipelineFlush && this.pipelineEntry.ready) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups);
      }
    }
    for (let i = startBindGroupIndex; i < this.bindGroups.length; i++) {
      this.updateBindGroup(this.bindGroups[i]);
    }
  }
  /**
   * Render the material if it is ready. Call super, and the set the pass encoder stencil reference if needed.
   * @param pass - Current pass encoder.
   */
  render(pass) {
    if (!this.ready) return;
    super.render(pass);
    if (this.options.rendering.stencil) {
      pass.setStencilReference(this.options.rendering.stencil.stencilReference ?? 0);
    }
  }
}

export { RenderMaterial };
