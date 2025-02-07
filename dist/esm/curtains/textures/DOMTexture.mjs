import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { MediaTexture } from '../../core/textures/MediaTexture.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Mat3 } from '../../math/Mat3.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var _parentRatio, _sourceRatio, _coverScale, _negatedOrigin, _rotationMatrix;
const defaultDOMTextureParams = {
  name: "texture",
  generateMips: false,
  flipY: false,
  format: "rgba8unorm",
  premultipliedAlpha: false,
  placeholderColor: [0, 0, 0, 255],
  // default to black
  useExternalTextures: true,
  fromTexture: null,
  visibility: ["fragment"],
  cache: true
};
class DOMTexture extends MediaTexture {
  /**
   * DOMTexture constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
   * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
   */
  constructor(renderer, parameters = defaultDOMTextureParams) {
    renderer = isCurtainsRenderer(renderer, "DOMTexture");
    super(renderer, { ...parameters, useTransform: true, viewDimension: "2d" });
    /** {@link DOMProjectedMesh} mesh if any. */
    this._mesh = null;
    /**
     * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link mesh} {@link core/DOM/DOMElement.RectSize | size}.
     * @private
     */
    __privateAdd(this, _parentRatio, new Vec2(1));
    /**
     * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link size | source size}.
     * @private
     */
    __privateAdd(this, _sourceRatio, new Vec2(1));
    /**
     * {@link Vec2} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio.
     * @private
     */
    __privateAdd(this, _coverScale, new Vec2(1));
    /**
     * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link transformOrigin}.
     * @private
     */
    __privateAdd(this, _negatedOrigin, new Vec2());
    /**
     * Rotation {@link Mat3} based on texture {@link rotation}.
     * @private
     */
    __privateAdd(this, _rotationMatrix, new Mat3());
    this.transformOrigin.set(0.5, 0.5);
    this.type = "DOMTexture";
    this.renderer.addDOMTexture(this);
  }
  /**
   * Get our texture parent {@link mesh} if any.
   */
  get mesh() {
    return this._mesh;
  }
  /**
   * Set our texture parent {@link mesh}.
   * @param value - texture parent {@link mesh} to set.
   */
  set mesh(value) {
    this._mesh = value;
    this.resize();
  }
  /* TEXTURE MATRIX */
  /**
   * Update the {@link modelMatrix}.
   */
  updateModelMatrix() {
    if (!this.mesh) {
      super.updateModelMatrix();
      return;
    }
    const parentScale = this.mesh.scale;
    const parentWidth = this.mesh.boundingRect.width * parentScale.x;
    const parentHeight = this.mesh.boundingRect.height * parentScale.y;
    const parentRatio = parentWidth / parentHeight;
    const sourceRatio = this.size.width / this.size.height;
    if (parentWidth > parentHeight) {
      __privateGet(this, _parentRatio).set(parentRatio, 1);
      __privateGet(this, _sourceRatio).set(1 / sourceRatio, 1);
    } else {
      __privateGet(this, _parentRatio).set(1, 1 / parentRatio);
      __privateGet(this, _sourceRatio).set(1, sourceRatio);
    }
    const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? __privateGet(this, _parentRatio).x * __privateGet(this, _sourceRatio).x : __privateGet(this, _sourceRatio).y * __privateGet(this, _parentRatio).y;
    __privateGet(this, _coverScale).set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y));
    __privateGet(this, _negatedOrigin).copy(this.transformOrigin).multiplyScalar(-1);
    __privateGet(this, _rotationMatrix).rotateByAngle(this.rotation);
    this.modelMatrix.identity().premultiplyTranslate(__privateGet(this, _negatedOrigin)).premultiplyScale(__privateGet(this, _coverScale)).premultiplyScale(__privateGet(this, _parentRatio)).premultiply(__privateGet(this, _rotationMatrix)).premultiplyScale(__privateGet(this, _sourceRatio)).premultiplyTranslate(this.transformOrigin).translate(this.offset);
    this.transformBinding.inputs.matrix.shouldUpdate = true;
  }
  /**
   * Set our source size and update the {@link modelMatrix}.
   */
  setSourceSize() {
    super.setSourceSize();
    this.updateModelMatrix();
  }
  /**
   * Resize our {@link DOMTexture}.
   */
  resize() {
    if (this.source && this.source instanceof HTMLCanvasElement && (this.source.width !== this.size.width || this.source.height !== this.size.height)) {
      this.setSourceSize();
      this.sources[0].shouldUpdate = true;
    } else {
      super.resize();
    }
    this.updateModelMatrix();
  }
  /**
   * Get our unique source, since {@link DOMTexture} have a fixed '2d' view dimension.
   * @returns - Our unique source, i.e. first element of {@link sources} array if it exists.
   * @readonly
   */
  get source() {
    return this.sources.length ? this.sources[0].source : null;
  }
  /**
   * Copy a {@link DOMTexture}.
   * @param texture - {@link DOMTexture} to copy.
   */
  copy(texture) {
    super.copy(texture);
    this.updateModelMatrix();
  }
  /* DESTROY */
  /**
   * Destroy the {@link DOMTexture}.
   */
  destroy() {
    this.renderer.removeDOMTexture(this);
    super.destroy();
  }
}
_parentRatio = new WeakMap();
_sourceRatio = new WeakMap();
_coverScale = new WeakMap();
_negatedOrigin = new WeakMap();
_rotationMatrix = new WeakMap();

export { DOMTexture };
