import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID } from '../../utils/utils.mjs';

let pipelineId = 0;
class PipelineEntry {
  /**
   * PipelineEntry constructor
   * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link PipelineEntry}
   */
  constructor(parameters) {
    this.type = "PipelineEntry";
    this.uuid = generateUUID();
    let { renderer } = parameters;
    const { label, shaders, useAsync, bindGroups, cacheKey } = parameters;
    renderer = isRenderer(renderer, label ? label + " " + this.type : this.type);
    this.renderer = renderer;
    Object.defineProperty(this, "index", { value: pipelineId++ });
    this.layout = null;
    this.pipeline = null;
    this.status = {
      compiling: false,
      compiled: false,
      error: null
    };
    this.options = {
      label,
      shaders,
      useAsync: useAsync !== void 0 ? useAsync : true,
      bindGroups,
      cacheKey
    };
    this.bindGroups = bindGroups;
  }
  /**
   * Set or reset this {@link PipelineEntry} {@link PipelineEntry.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    renderer = isRenderer(renderer, this.options.label + " " + this.type);
    this.renderer = renderer;
  }
  /**
   * Get whether the {@link pipeline} is ready, i.e. successfully compiled
   * @readonly
   */
  get ready() {
    return !this.status.compiling && this.status.compiled && !this.status.error;
  }
  /**
   * Get whether the {@link pipeline} is ready to be compiled, i.e. we have not already tried to compile it, and it's not currently compiling neither
   * @readonly
   */
  get canCompile() {
    return !this.status.compiling && !this.status.compiled && !this.status.error;
  }
  /* SHADERS */
  /**
   * Create a {@link GPUShaderModule}
   * @param parameters - Parameters used
   * @param parameters.code - patched WGSL code string
   * @param parameters.type - {@link MaterialShadersType | shader type}
   * @returns - compiled {@link GPUShaderModule} if successful
   */
  createShaderModule({ code = "", type = "vertex" }) {
    const shaderModule = this.renderer.createShaderModule({
      label: this.options.label + ": " + type + " shader module",
      code
    });
    if ("getCompilationInfo" in shaderModule && !this.renderer.production) {
      shaderModule.getCompilationInfo().then((compilationInfo) => {
        for (const message of compilationInfo.messages) {
          let formattedMessage = "";
          if (message.lineNum) {
            formattedMessage += `Line ${message.lineNum}:${message.linePos} - ${code.substring(
              message.offset,
              message.offset + message.length
            )}
`;
          }
          formattedMessage += message.message;
          switch (message.type) {
            case "error":
              console.error(`${this.options.label} compilation error:
${formattedMessage}`);
              break;
            case "warning":
              console.warn(`${this.options.label} compilation warning:
${formattedMessage}`);
              break;
            case "info":
              console.log(`${this.options.label} compilation information:
${formattedMessage}`);
              break;
          }
        }
      });
    }
    return shaderModule;
  }
  /* SETUP */
  /**
   * Create the {@link PipelineEntry} shaders
   */
  createShaders() {
  }
  /**
   * Create the pipeline entry {@link layout}
   */
  createPipelineLayout() {
    this.layout = this.renderer.createPipelineLayout({
      label: this.options.label + " layout",
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout)
    });
  }
  /**
   * Create the {@link PipelineEntry} descriptor.
   */
  createPipelineDescriptor() {
  }
  /**
   * Flush a {@link PipelineEntry}, i.e. reset its {@link bindGroups | bind groups}, {@link layout} and descriptor and recompile the {@link pipeline}.
   * Used when one of the bind group or rendering property has changed.
   * @param newBindGroups - new {@link bindGroups | bind groups} in case they have changed.
   * @param cacheKey - new {@link core/materials/Material.Material#cacheKey | Material cacheKey} in case it has changed.
   */
  flushPipelineEntry(newBindGroups = [], cacheKey = "") {
    this.options.bindGroups = newBindGroups;
    this.options.cacheKey = cacheKey;
    this.status.compiling = false;
    this.status.compiled = false;
    this.status.error = null;
    this.bindGroups = newBindGroups;
    this.compilePipelineEntry();
  }
  /**
   * Set up a {@link pipeline} by creating the shaders, the {@link layout} and the descriptor
   */
  compilePipelineEntry() {
    this.status.compiling = true;
    this.createShaders();
    this.createPipelineLayout();
    this.createPipelineDescriptor();
  }
}

export { PipelineEntry };
