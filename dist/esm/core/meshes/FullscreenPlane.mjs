import { MeshBaseMixin } from './mixins/MeshBaseMixin.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { PlaneGeometry } from '../geometries/PlaneGeometry.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { cacheManager } from '../../utils/CacheManager.mjs';

class FullscreenPlane extends MeshBaseMixin(class {
}) {
  /**
   * FullscreenPlane constructor
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
   * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link FullscreenPlane}
   */
  constructor(renderer, parameters = {}) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + " FullscreenQuadMesh" : "FullscreenQuadMesh");
    let geometry = cacheManager.getPlaneGeometryByID(2);
    if (!geometry) {
      geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 });
      cacheManager.addPlaneGeometry(geometry);
    }
    if (!parameters.shaders || !parameters.shaders.vertex) {
      ["uniforms", "storages"].forEach((bindingType) => {
        Object.values(parameters[bindingType] ?? {}).forEach(
          (binding) => binding.visibility = ["fragment"]
        );
      });
    }
    parameters.depthWriteEnabled = false;
    if (!parameters.label) {
      parameters.label = "FullscreenQuadMesh";
    }
    super(renderer, null, { geometry, ...parameters });
    this.size = {
      document: {
        width: this.renderer.boundingRect.width,
        height: this.renderer.boundingRect.height,
        top: this.renderer.boundingRect.top,
        left: this.renderer.boundingRect.left
      }
    };
    this.type = "FullscreenQuadMesh";
  }
  /**
   * Resize our {@link FullscreenPlane}
   * @param boundingRect - the new bounding rectangle
   */
  resize(boundingRect = null) {
    this.size.document = boundingRect ?? this.renderer.boundingRect;
    super.resize(boundingRect);
  }
  /**
   * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link FullscreenPlane}
   * It ranges from -1 to 1 on both axis
   * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
   * @returns - the mapped {@link Vec2 | vector} coordinates in the [-1, 1] range
   */
  mouseToPlaneCoords(mouseCoords = new Vec2()) {
    return new Vec2(
      (mouseCoords.x - this.size.document.left) / this.size.document.width * 2 - 1,
      1 - (mouseCoords.y - this.size.document.top) / this.size.document.height * 2
    );
  }
}

export { FullscreenPlane };
