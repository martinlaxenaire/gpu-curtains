import { isRenderer } from '../../core/renderers/utils.mjs';
import { RenderTarget } from '../../core/renderPasses/RenderTarget.mjs';
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane.mjs';

class PingPongPlane extends FullscreenPlane {
  /**
   * PingPongPlane constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
   * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link PingPongPlane}
   */
  constructor(renderer, parameters = {}) {
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
    const colorAttachments = parameters.targets && parameters.targets.length && parameters.targets.map((target) => {
      return {
        targetFormat: target.format
      };
    });
    parameters.outputTarget = new RenderTarget(renderer, {
      label: parameters.label ? parameters.label + " render target" : "Ping Pong render target",
      useDepth: false,
      ...colorAttachments && { colorAttachments }
    });
    parameters.transparent = false;
    parameters.depth = false;
    parameters.label = parameters.label ?? "PingPongPlane " + renderer.pingPongPlanes?.length;
    super(renderer, parameters);
    this.type = "PingPongPlane";
    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
      name: "renderTexture",
      ...parameters.targets && parameters.targets.length && { format: parameters.targets[0].format }
    });
  }
  /**
   * Get our main {@link RenderTexture}, the one that contains our ping pong content
   * @readonly
   */
  get renderTexture() {
    return this.renderTextures.find((texture) => texture.options.name === "renderTexture");
  }
  /**
   * Add the {@link PingPongPlane} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.pingPongPlanes.push(this);
    if (this.autoRender) {
      this.renderer.scene.addPingPongPlane(this);
    }
  }
  /**
   * Remove the {@link PingPongPlane} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.outputTarget) {
      this.outputTarget.destroy();
    }
    if (this.autoRender) {
      this.renderer.scene.removePingPongPlane(this);
    }
    this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
  }
}

export { PingPongPlane };
