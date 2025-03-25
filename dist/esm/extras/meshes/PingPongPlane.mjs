import { isRenderer } from '../../core/renderers/utils.mjs';
import { RenderTarget } from '../../core/renderPasses/RenderTarget.mjs';
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane.mjs';

class PingPongPlane extends FullscreenPlane {
  /**
   * PingPongPlane constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}.
   * @param parameters - {@link PingPongPlaneParams | parameters} use to create this {@link PingPongPlane}.
   */
  constructor(renderer, parameters = {}) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
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
    this.renderTexture = this.createTexture({
      label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
      name: parameters.renderTextureName ?? "renderTexture",
      ...parameters.targets && parameters.targets.length && { format: parameters.targets[0].format },
      usage: ["copyDst", "textureBinding"]
    });
  }
  /**
   * Add the {@link PingPongPlane} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
   * @param addToRenderer - Whether to add this {@link PingPongPlane} to the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}.
   */
  addToScene(addToRenderer = false) {
    if (addToRenderer) {
      this.renderer.pingPongPlanes.push(this);
    }
    if (this.autoRender) {
      this.renderer.scene.addPingPongPlane(this);
    }
  }
  /**
   * Remove the {@link PingPongPlane} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
   * @param removeFromRenderer - Whether to remove this {@link PingPongPlane} from the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}.
   */
  removeFromScene(removeFromRenderer = false) {
    if (this.outputTarget) {
      this.outputTarget.destroy();
    }
    if (this.autoRender) {
      this.renderer.scene.removePingPongPlane(this);
    }
    if (removeFromRenderer) {
      this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
    }
  }
}

export { PingPongPlane };
