import { PipelineEntry } from './PipelineEntry.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { throwError } from '../../utils/utils.mjs';

class ComputePipelineEntry extends PipelineEntry {
  /**
   * ComputePipelineEntry constructor
   * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link ComputePipelineEntry}
   */
  constructor(parameters) {
    let { renderer } = parameters;
    const { label } = parameters;
    renderer = renderer && renderer.renderer || renderer;
    const type = "ComputePipelineEntry";
    isRenderer(renderer, label ? label + " " + type : type);
    super(parameters);
    this.type = type;
    this.shaders = {
      compute: {
        head: "",
        code: "",
        module: null
      }
    };
    this.descriptor = null;
  }
  /**
   * Set {@link ComputePipelineEntry} properties (in this case the {@link bindGroups | bind groups})
   * @param parameters - the {@link core/materials/ComputeMaterial.ComputeMaterial#bindGroups | bind groups} to use
   */
  setPipelineEntryProperties(parameters) {
    const { bindGroups } = parameters;
    this.setPipelineEntryBindGroups(bindGroups);
  }
  /* SHADERS */
  /**
   * Patch the shaders by appending all the {@link bindGroups | bind groups}) WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
   */
  patchShaders() {
    this.shaders.compute.head = "";
    this.shaders.compute.code = "";
    const groupsBindings = [];
    this.bindGroups.forEach((bindGroup) => {
      let bindIndex = 0;
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
            visibility: binding.visibility,
            bindIndex,
            wgslStructFragment: binding.wgslStructFragment,
            wgslGroupFragment: groupFragment,
            newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
          });
          bindIndex++;
        });
      });
    });
    groupsBindings.forEach((groupBinding) => {
      if (groupBinding.wgslStructFragment && this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1) {
        this.shaders.compute.head = `
${groupBinding.wgslStructFragment}
${this.shaders.compute.head}`;
      }
      if (this.shaders.compute.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
        this.shaders.compute.head = `${this.shaders.compute.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
      }
      if (groupBinding.newLine)
        this.shaders.compute.head += `
`;
    });
    this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code;
  }
  /* SETUP */
  /**
   * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders();
    this.shaders.compute.module = this.createShaderModule({
      code: this.shaders.compute.code,
      type: "compute"
    });
  }
  /**
   * Create the compute pipeline {@link descriptor}
   */
  createPipelineDescriptor() {
    if (!this.shaders.compute.module)
      return;
    this.descriptor = {
      label: this.options.label,
      layout: this.layout,
      compute: {
        module: this.shaders.compute.module,
        entryPoint: this.options.shaders.compute.entryPoint
      }
    };
  }
  /**
   * Create the compute {@link pipeline}
   */
  createComputePipeline() {
    if (!this.shaders.compute.module)
      return;
    try {
      this.pipeline = this.renderer.createComputePipeline(this.descriptor);
    } catch (error) {
      this.status.error = error;
      throwError(error);
    }
  }
  /**
   * Asynchronously create the compute {@link pipeline}
   * @async
   * @returns - void promise result
   */
  async createComputePipelineAsync() {
    if (!this.shaders.compute.module)
      return;
    try {
      this.pipeline = await this.renderer.createComputePipelineAsync(this.descriptor);
      this.status.compiled = true;
      this.status.compiling = false;
      this.status.error = null;
    } catch (error) {
      this.status.error = error;
      throwError(error);
    }
  }
  /**
   * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our compute {@link pipeline}
   * @async
   */
  async compilePipelineEntry() {
    super.compilePipelineEntry();
    if (this.options.useAsync) {
      await this.createComputePipelineAsync();
    } else {
      this.createComputePipeline();
      this.status.compiled = true;
      this.status.compiling = false;
      this.status.error = null;
    }
  }
}

export { ComputePipelineEntry };
//# sourceMappingURL=ComputePipelineEntry.mjs.map
