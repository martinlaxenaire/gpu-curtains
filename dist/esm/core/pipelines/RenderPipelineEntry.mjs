import { PipelineEntry } from './PipelineEntry.mjs';
import { ShaderChunks, ProjectedShaderChunks } from '../shaders/ShaderChunks.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { throwError } from '../../utils/utils.mjs';

class RenderPipelineEntry extends PipelineEntry {
  /**
   * RenderPipelineEntry constructor
   * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
   */
  constructor(parameters) {
    let { renderer, ...pipelineParams } = parameters;
    const { label, attributes, bindGroups, cacheKey, ...renderingOptions } = pipelineParams;
    const type = "RenderPipelineEntry";
    isRenderer(renderer, label ? label + " " + type : type);
    super(parameters);
    this.type = type;
    this.shaders = {
      vertex: {
        head: "",
        code: "",
        module: null
      },
      fragment: {
        head: "",
        code: "",
        module: null
      },
      full: {
        head: "",
        code: "",
        module: null
      }
    };
    this.descriptor = null;
    this.options = {
      ...this.options,
      attributes,
      bindGroups,
      cacheKey,
      ...renderingOptions
    };
    this.setPipelineEntryProperties({ attributes, bindGroups });
  }
  /**
   * Set {@link RenderPipelineEntry} properties (in this case the {@link bindGroups | bind groups} and {@link attributes})
   * @param parameters - the {@link core/materials/RenderMaterial.RenderMaterial#bindGroups | bind groups} and {@link core/materials/RenderMaterial.RenderMaterial#attributes | attributes} to use
   */
  setPipelineEntryProperties(parameters) {
    const { attributes, bindGroups } = parameters;
    this.attributes = attributes;
    this.setPipelineEntryBindGroups(bindGroups);
  }
  /* SHADERS */
  /**
   * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
   */
  patchShaders() {
    this.shaders.vertex.head = "";
    this.shaders.vertex.code = "";
    this.shaders.fragment.head = "";
    this.shaders.fragment.code = "";
    this.shaders.full.head = "";
    this.shaders.full.code = "";
    for (const chunk in ShaderChunks.vertex) {
      this.shaders.vertex.head = `${ShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
      this.shaders.full.head = `${ShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
    }
    if (this.options.shaders.fragment) {
      for (const chunk in ShaderChunks.fragment) {
        this.shaders.fragment.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
        if (this.shaders.full.head.indexOf(ShaderChunks.fragment[chunk]) === -1) {
          this.shaders.full.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
        }
      }
    }
    if (this.options.rendering.useProjection) {
      for (const chunk in ProjectedShaderChunks.vertex) {
        this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
        this.shaders.full.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
      }
      if (this.options.shaders.fragment) {
        for (const chunk in ProjectedShaderChunks.fragment) {
          this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
          if (this.shaders.full.head.indexOf(ProjectedShaderChunks.fragment[chunk]) === -1) {
            this.shaders.full.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
          }
        }
      }
    }
    const groupsBindings = [];
    for (const bindGroup of this.bindGroups) {
      let bindIndex = 0;
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
            visibility: binding.options.visibility,
            bindIndex,
            wgslStructFragment: binding.wgslStructFragment,
            wgslGroupFragment: groupFragment,
            newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
          });
          bindIndex++;
        });
      });
    }
    for (const groupBinding of groupsBindings) {
      if (groupBinding.visibility.includes("vertex")) {
        if (groupBinding.wgslStructFragment && this.shaders.vertex.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.vertex.head = `
${groupBinding.wgslStructFragment}
${this.shaders.vertex.head}`;
        }
        if (this.shaders.vertex.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.vertex.head = `${this.shaders.vertex.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine)
            this.shaders.vertex.head += `
`;
        }
      }
      if (this.options.shaders.fragment && groupBinding.visibility.includes("fragment")) {
        if (groupBinding.wgslStructFragment && this.shaders.fragment.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.fragment.head = `
${groupBinding.wgslStructFragment}
${this.shaders.fragment.head}`;
        }
        if (this.shaders.fragment.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.fragment.head = `${this.shaders.fragment.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine)
            this.shaders.fragment.head += `
`;
        }
      }
      if (groupBinding.wgslStructFragment && this.shaders.full.head.indexOf(groupBinding.wgslStructFragment) === -1) {
        this.shaders.full.head = `
${groupBinding.wgslStructFragment}
${this.shaders.full.head}`;
      }
      if (this.shaders.full.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
        this.shaders.full.head = `${this.shaders.full.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
        if (groupBinding.newLine)
          this.shaders.full.head += `
`;
      }
    }
    this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
    this.shaders.full.head = `${this.attributes.wgslStructFragment}
${this.shaders.full.head}`;
    this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
    if (typeof this.options.shaders.fragment === "object")
      this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
    if (typeof this.options.shaders.fragment === "object") {
      if (this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0) {
        this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code;
      } else {
        this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code + this.options.shaders.fragment.code;
      }
    }
  }
  /* SETUP */
  /**
   * Get whether the shaders modules have been created
   * @readonly
   */
  get shadersModulesReady() {
    return !(!this.shaders.vertex.module || this.options.shaders.fragment && !this.shaders.fragment.module);
  }
  /**
   * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders();
    const isSameShader = typeof this.options.shaders.fragment === "object" && this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0;
    this.shaders.vertex.module = this.createShaderModule({
      code: this.shaders[isSameShader ? "full" : "vertex"].code,
      type: "vertex"
    });
    if (this.options.shaders.fragment) {
      this.shaders.fragment.module = this.createShaderModule({
        code: this.shaders[isSameShader ? "full" : "fragment"].code,
        type: "fragment"
      });
    }
  }
  /**
   * Get default transparency blend state.
   * @returns - The default transparency blend state.
   */
  static getDefaultTransparentBlending() {
    return {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha"
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha"
      }
    };
  }
  /**
   * Create the render pipeline {@link descriptor}
   */
  createPipelineDescriptor() {
    if (!this.shadersModulesReady)
      return;
    let vertexLocationIndex = -1;
    if (this.options.rendering.targets.length) {
      if (this.options.rendering.transparent) {
        this.options.rendering.targets[0].blend = this.options.rendering.targets[0].blend ? this.options.rendering.targets[0].blend : RenderPipelineEntry.getDefaultTransparentBlending();
      }
    } else {
      this.options.rendering.targets = [];
    }
    this.descriptor = {
      label: this.options.label,
      layout: this.layout,
      vertex: {
        module: this.shaders.vertex.module,
        entryPoint: this.options.shaders.vertex.entryPoint,
        buffers: this.attributes.vertexBuffers.map((vertexBuffer) => {
          return {
            stepMode: vertexBuffer.stepMode,
            arrayStride: vertexBuffer.arrayStride * 4,
            // 4 bytes each
            attributes: vertexBuffer.attributes.map((attribute) => {
              vertexLocationIndex++;
              return {
                shaderLocation: vertexLocationIndex,
                offset: attribute.bufferOffset,
                // previous attribute size * 4
                format: attribute.bufferFormat
              };
            })
          };
        })
      },
      ...this.options.shaders.fragment && {
        fragment: {
          module: this.shaders.fragment.module,
          entryPoint: this.options.shaders.fragment.entryPoint,
          targets: this.options.rendering.targets
        }
      },
      primitive: {
        topology: this.options.rendering.topology,
        frontFace: this.options.rendering.verticesOrder,
        cullMode: this.options.rendering.cullMode
      },
      ...this.options.rendering.depth && {
        depthStencil: {
          depthWriteEnabled: this.options.rendering.depthWriteEnabled,
          depthCompare: this.options.rendering.depthCompare,
          format: this.options.rendering.depthFormat
        }
      },
      ...this.options.rendering.sampleCount > 1 && {
        multisample: {
          count: this.options.rendering.sampleCount
        }
      }
    };
  }
  /**
   * Create the render {@link pipeline}
   */
  createRenderPipeline() {
    if (!this.shadersModulesReady)
      return;
    try {
      this.pipeline = this.renderer.createRenderPipeline(this.descriptor);
    } catch (error) {
      this.status.error = error;
      throwError(error);
    }
  }
  /**
   * Asynchronously create the render {@link pipeline}
   * @async
   * @returns - void promise result
   */
  async createRenderPipelineAsync() {
    if (!this.shadersModulesReady)
      return;
    try {
      this.pipeline = await this.renderer.createRenderPipelineAsync(this.descriptor);
      this.status.compiled = true;
      this.status.compiling = false;
      this.status.error = null;
    } catch (error) {
      this.status.error = error;
      throwError(error);
    }
  }
  /**
   * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
   * @async
   */
  async compilePipelineEntry() {
    super.compilePipelineEntry();
    if (this.options.useAsync) {
      await this.createRenderPipelineAsync();
    } else {
      this.createRenderPipeline();
      this.status.compiled = true;
      this.status.compiling = false;
      this.status.error = null;
    }
  }
}

export { RenderPipelineEntry };
