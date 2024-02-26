import { FullscreenPlane } from '../meshes/FullscreenPlane.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import default_pass_fsWGSl from '../shaders/chunks/default_pass_fs.wgsl.mjs';
import { throwWarning } from '../../utils/utils.mjs';

class ShaderPass extends FullscreenPlane {
  /**
   * ShaderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
   */
  constructor(renderer, parameters = {}) {
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
    parameters.transparent = true;
    parameters.label = parameters.label ?? "ShaderPass " + renderer.shaderPasses?.length;
    parameters.sampleCount = !!parameters.sampleCount ? parameters.sampleCount : renderer && renderer.postProcessingPass ? renderer && renderer.postProcessingPass.options.sampleCount : 1;
    if (!parameters.shaders) {
      parameters.shaders = {};
    }
    if (!parameters.shaders.fragment) {
      parameters.shaders.fragment = {
        code: default_pass_fsWGSl,
        entryPoint: "main"
      };
    }
    parameters.depth = false;
    super(renderer, parameters);
    if (parameters.inputTarget) {
      this.setInputTarget(parameters.inputTarget);
    }
    if (this.outputTarget) {
      this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass);
    }
    this.type = "ShaderPass";
    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
      name: "renderTexture",
      fromTexture: this.inputTarget ? this.inputTarget.renderTexture : null,
      ...this.outputTarget && this.outputTarget.options.qualityRatio && { qualityRatio: this.outputTarget.options.qualityRatio }
    });
  }
  /**
   * Hook used to clean up parameters before sending them to the material.
   * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
   * @returns - cleaned parameters
   */
  cleanupRenderMaterialParameters(parameters) {
    delete parameters.copyOutputToRenderTexture;
    delete parameters.inputTarget;
    super.cleanupRenderMaterialParameters(parameters);
    return parameters;
  }
  /**
   * Get our main {@link RenderTexture} that contains the input content to be used by the {@link ShaderPass}. Can also contain the ouputted content if {@link ShaderPassOptions#copyOutputToRenderTexture | copyOutputToRenderTexture} is set to true.
   * @readonly
   */
  get renderTexture() {
    return this.renderTextures.find((texture) => texture.options.name === "renderTexture");
  }
  /**
   * Assign or remove an input {@link RenderTarget} to this {@link ShaderPass}, which can be different from what has just been drawn to the {@link core/renderers/GPURenderer.GPURenderer#context | context} current texture.
   *
   * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
   * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
   * @param inputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
   */
  setInputTarget(inputTarget) {
    if (inputTarget && inputTarget.type !== "RenderTarget") {
      throwWarning(`${this.options.label ?? this.type}: inputTarget is not a RenderTarget: ${inputTarget}`);
      return;
    }
    this.removeFromScene();
    this.inputTarget = inputTarget;
    this.addToScene();
    if (this.renderTexture) {
      if (inputTarget) {
        this.renderTexture.copy(this.inputTarget.renderTexture);
      } else {
        this.renderTexture.options.fromTexture = null;
        this.renderTexture.createTexture();
      }
    }
  }
  /**
   * Add the {@link ShaderPass} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.shaderPasses.push(this);
    this.setRenderingOptionsForRenderPass(
      this.outputTarget ? this.outputTarget.renderPass : this.renderer.postProcessingPass
    );
    if (this.autoRender) {
      this.renderer.scene.addShaderPass(this);
    }
  }
  /**
   * Remove the {@link ShaderPass} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.outputTarget) {
      this.outputTarget.destroy();
    }
    if (this.autoRender) {
      this.renderer.scene.removeShaderPass(this);
    }
    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid);
  }
}

export { ShaderPass };
