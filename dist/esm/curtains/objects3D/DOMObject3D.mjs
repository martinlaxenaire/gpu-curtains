import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D.mjs';
import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { DOMElement } from '../../core/DOM/DOMElement.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

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
var _DOMObjectWorldPosition, _DOMObjectWorldScale;
class DOMObject3D extends ProjectedObject3D {
  /**
   * DOMObject3D constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
   * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
   */
  constructor(renderer, element, parameters) {
    super(renderer);
    /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3DTransforms#position.world | world position} accounting the {@link DOMObject3DTransforms#position.document | additional document translation} converted into world space */
    __privateAdd(this, _DOMObjectWorldPosition, new Vec3());
    /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3D} world scale accounting the {@link DOMObject3D#size.world | DOMObject3D world size} */
    __privateAdd(this, _DOMObjectWorldScale, new Vec3());
    renderer = renderer && renderer.renderer || renderer;
    isCurtainsRenderer(renderer, "DOM3DObject");
    this.renderer = renderer;
    this.size = {
      world: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      },
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      }
    };
    this.watchScroll = parameters.watchScroll;
    this.camera = this.renderer.camera;
    this.setDOMElement(element);
  }
  /**
   * Set the {@link domElement | DOM Element}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  setDOMElement(element) {
    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: (boundingRect) => this.onPositionChanged(boundingRect)
    });
  }
  /**
   * Update size and position when the {@link domElement | DOM Element} position changed
   * @param boundingRect - the new bounding rectangle
   */
  onPositionChanged(boundingRect) {
    if (this.watchScroll) {
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
      this.updateSizeAndPosition();
    }
  }
  /**
   * Reset the {@link domElement | DOMElement}
   * @param element - the new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  resetDOMElement(element) {
    if (this.domElement) {
      this.domElement.destroy();
    }
    this.setDOMElement(element);
  }
  /**
   * Update the {@link DOMObject3D} sizes and position
   */
  updateSizeAndPosition() {
    this.setWorldSizes();
    this.applyPosition();
    this.shouldUpdateModelMatrix();
  }
  /**
   * Update the {@link DOMObject3D} sizes, position and projection
   */
  shouldUpdateMatrixStack() {
    this.updateSizeAndPosition();
    super.shouldUpdateMatrixStack();
  }
  /**
   * Resize the {@link DOMObject3D}
   * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   */
  resize(boundingRect) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
      return;
    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
    this.shouldUpdateMatrixStack();
  }
  /* BOUNDING BOXES GETTERS */
  /**
   * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   * @readonly
   */
  get boundingRect() {
    return this.domElement.boundingRect;
  }
  /* TRANSFOMS */
  /**
   * Set our transforms properties and {@link Vec3#onChange | onChange vector} callbacks
   */
  setTransforms() {
    super.setTransforms();
    this.transforms.origin.model.set(0.5, 0.5, 0);
    this.transforms.origin.world = new Vec3();
    this.transforms.position.document = new Vec3();
    this.documentPosition.onChange(() => this.applyPosition());
    this.transformOrigin.onChange(() => this.setWorldTransformOrigin());
  }
  /**
   * Get the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
   */
  get documentPosition() {
    return this.transforms.position.document;
  }
  /**
   * Set the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
   * @param value - additional translation relative to the document to apply
   */
  set documentPosition(value) {
    this.transforms.position.document = value;
    this.applyPosition();
  }
  /**
   * Get the {@link domElement | DOM element} scale in world space
   * @readonly
   */
  get DOMObjectWorldScale() {
    return __privateGet(this, _DOMObjectWorldScale).clone();
  }
  /**
   * Get the {@link DOMObject3D} scale in world space (accounting for {@link scale})
   * @readonly
   */
  get worldScale() {
    return this.DOMObjectWorldScale.multiply(this.scale);
  }
  /**
   * Get the {@link DOMObject3D} position in world space
   * @readonly
   */
  get worldPosition() {
    return __privateGet(this, _DOMObjectWorldPosition).clone();
  }
  /**
   * Get the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
   */
  get transformOrigin() {
    return this.transforms.origin.model;
  }
  /**
   * Set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
   * @param value - new transform origin
   */
  set transformOrigin(value) {
    this.transforms.origin.model = value;
    this.setWorldTransformOrigin();
  }
  /**
   * Get the {@link DOMObject3D} transform origin in world space
   */
  get worldTransformOrigin() {
    return this.transforms.origin.world;
  }
  /**
   * Set the {@link DOMObject3D} transform origin in world space
   * @param value - new world space transform origin
   */
  set worldTransformOrigin(value) {
    this.transforms.origin.world = value;
  }
  /**
   * Set the {@link DOMObject3D} world position using its world position and document translation converted to world space
   */
  applyPosition() {
    this.applyDocumentPosition();
    super.applyPosition();
  }
  /**
   * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
   */
  applyDocumentPosition() {
    let worldPosition = new Vec3(0, 0, 0);
    if (!this.documentPosition.equals(worldPosition)) {
      worldPosition = this.documentToWorldSpace(this.documentPosition);
    }
    __privateGet(this, _DOMObjectWorldPosition).set(
      this.position.x + this.size.world.left + worldPosition.x,
      this.position.y + this.size.world.top + worldPosition.y,
      this.position.z + this.documentPosition.z / this.camera.CSSPerspective
    );
  }
  /**
   * Apply the transform origin and set the {@link DOMObject3D} world transform origin
   */
  applyTransformOrigin() {
    if (!this.size)
      return;
    this.setWorldTransformOrigin();
    super.applyTransformOrigin();
  }
  /* MATRICES */
  /**
   * Update the {@link modelMatrix | model matrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale
   */
  updateModelMatrix() {
    this.modelMatrix.composeFromOrigin(
      __privateGet(this, _DOMObjectWorldPosition),
      this.quaternion,
      this.scale,
      this.worldTransformOrigin
    );
    this.modelMatrix.scale(__privateGet(this, _DOMObjectWorldScale));
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
   * @param vector - document position {@link Vec3 | vector} converted to world space
   */
  documentToWorldSpace(vector = new Vec3()) {
    return new Vec3(
      vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.screenRatio.width,
      -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.screenRatio.height,
      vector.z
    );
  }
  /**
   * Set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
   */
  setWorldSizes() {
    const containerBoundingRect = this.renderer.boundingRect;
    const planeCenter = {
      x: this.size.document.width / 2 + this.size.document.left,
      y: this.size.document.height / 2 + this.size.document.top
    };
    const containerCenter = {
      x: containerBoundingRect.width / 2 + containerBoundingRect.left,
      y: containerBoundingRect.height / 2 + containerBoundingRect.top
    };
    this.size.world = {
      width: this.size.document.width / containerBoundingRect.width * this.camera.screenRatio.width / 2,
      height: this.size.document.height / containerBoundingRect.height * this.camera.screenRatio.height / 2,
      top: (containerCenter.y - planeCenter.y) / containerBoundingRect.height * this.camera.screenRatio.height,
      left: (planeCenter.x - containerCenter.x) / containerBoundingRect.width * this.camera.screenRatio.width
    };
    __privateGet(this, _DOMObjectWorldScale).set(this.size.world.width, this.size.world.height, 1);
    this.setWorldTransformOrigin();
  }
  /**
   * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
   */
  setWorldTransformOrigin() {
    this.transforms.origin.world = new Vec3(
      (this.transformOrigin.x * 2 - 1) * // between -1 and 1
      this.size.world.width,
      -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
      this.size.world.height,
      this.transformOrigin.z
    );
    this.shouldUpdateModelMatrix();
    this.shouldUpdateProjectionMatrixStack();
  }
  /**
   * Update the {@link domElement | DOM Element} scroll position
   * @param delta - last {@link utils/ScrollManager.ScrollManager.delta | scroll delta values}
   */
  updateScrollPosition(delta = { x: 0, y: 0 }) {
    if (delta.x || delta.y) {
      this.domElement.updateScrollPosition(delta);
    }
  }
  /**
   * Destroy our {@link DOMObject3D}
   */
  destroy() {
    this.domElement?.destroy();
  }
}
_DOMObjectWorldPosition = new WeakMap();
_DOMObjectWorldScale = new WeakMap();

export { DOMObject3D };
