import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D.mjs';
import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { DOMElement } from '../../core/DOM/DOMElement.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Box3 } from '../../math/Box3.mjs';

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
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _DOMObjectWorldPosition, _DOMObjectWorldScale, _DOMObjectDepthScaleRatio;
class DOMObject3D extends ProjectedObject3D {
  /**
   * DOMObject3D constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
   * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
   */
  constructor(renderer, element, parameters = {}) {
    super(renderer);
    /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3DTransforms#position.world | world position} accounting the {@link DOMObject3DTransforms#position.document | additional document translation} converted into world space */
    __privateAdd(this, _DOMObjectWorldPosition, new Vec3());
    /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3D} world scale accounting the {@link DOMObject3D#size.world | DOMObject3D world size} */
    __privateAdd(this, _DOMObjectWorldScale, new Vec3(1));
    /** Private number representing the scale ratio of the {@link DOMObject3D} along Z axis to apply. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis. */
    __privateAdd(this, _DOMObjectDepthScaleRatio, 1);
    /** Helper {@link Box3 | bounding box} used to map the 3D object onto the 2D DOM element. */
    this.boundingBox = new Box3(new Vec3(-1), new Vec3(1));
    /** function assigned to the {@link onAfterDOMElementResize} callback */
    this._onAfterDOMElementResizeCallback = () => {
    };
    renderer = isCurtainsRenderer(renderer, "DOM3DObject");
    this.renderer = renderer;
    this.size = {
      shouldUpdate: true,
      normalizedWorld: {
        size: new Vec2(1),
        position: new Vec2()
      },
      cameraWorld: {
        size: new Vec2(1)
      },
      scaledWorld: {
        size: new Vec3(1),
        position: new Vec3()
      }
    };
    this.watchScroll = parameters.watchScroll;
    this.camera = this.renderer.camera;
    this.boundingBox.min.onChange(() => this.shouldUpdateComputedSizes());
    this.boundingBox.max.onChange(() => this.shouldUpdateComputedSizes());
    this.setDOMElement(element);
    this.renderer.domObjects.push(this);
  }
  /**
   * Set the {@link domElement | DOM Element}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  setDOMElement(element) {
    this.domElement = new DOMElement({
      element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
      onPositionChanged: () => this.onPositionChanged()
    });
    this.updateSizeAndPosition();
  }
  /**
   * Update size and position when the {@link domElement | DOM Element} position changed
   */
  onPositionChanged() {
    if (this.watchScroll) {
      this.shouldUpdateComputedSizes();
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
   * Resize the {@link DOMObject3D}
   * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   */
  resize(boundingRect = null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
      return;
    this.updateSizeAndPosition();
    this._onAfterDOMElementResizeCallback && this._onAfterDOMElementResizeCallback();
  }
  /* BOUNDING BOXES GETTERS */
  /**
   * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
   * @readonly
   */
  get boundingRect() {
    return this.domElement?.boundingRect ?? {
      width: 1,
      height: 1,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0
    };
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
   * Check whether at least one of the matrix should be updated
   */
  shouldUpdateMatrices() {
    super.shouldUpdateMatrices();
    if (this.matricesNeedUpdate || this.size.shouldUpdate) {
      this.updateSizeAndPosition();
    }
    this.size.shouldUpdate = false;
  }
  /**
   * Set the {@link DOMObject3D#size.shouldUpdate | size shouldUpdate} flag to true to compute the new sizes before next matrices calculations.
   */
  shouldUpdateComputedSizes() {
    this.size.shouldUpdate = true;
  }
  /**
   * Update the {@link DOMObject3D} sizes and position
   */
  updateSizeAndPosition() {
    this.setWorldSizes();
    this.applyDocumentPosition();
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
      this.position.x + this.size.scaledWorld.position.x + worldPosition.x,
      this.position.y + this.size.scaledWorld.position.y + worldPosition.y,
      this.position.z + this.size.scaledWorld.position.z + this.documentPosition.z / this.camera.CSSPerspective
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
    this.modelMatrix.scale(this.DOMObjectWorldScale);
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
   * @param vector - document position {@link Vec3 | vector} converted to world space
   */
  documentToWorldSpace(vector = new Vec3()) {
    return new Vec3(
      vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.visibleSize.width,
      -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.visibleSize.height,
      vector.z
    );
  }
  /**
   * Compute the {@link DOMObject3D#size | world sizes}
   */
  computeWorldSizes() {
    const containerBoundingRect = this.renderer.boundingRect;
    const planeCenter = {
      x: this.boundingRect.width / 2 + this.boundingRect.left,
      y: this.boundingRect.height / 2 + this.boundingRect.top
    };
    const containerCenter = {
      x: containerBoundingRect.width / 2 + containerBoundingRect.left,
      y: containerBoundingRect.height / 2 + containerBoundingRect.top
    };
    const { size, center } = this.boundingBox;
    if (size.x !== 0 && size.y !== 0 && size.z !== 0) {
      center.divide(size);
    }
    this.size.normalizedWorld.size.set(
      this.boundingRect.width / containerBoundingRect.width,
      this.boundingRect.height / containerBoundingRect.height
    );
    this.size.normalizedWorld.position.set(
      (planeCenter.x - containerCenter.x) / containerBoundingRect.width,
      (containerCenter.y - planeCenter.y) / containerBoundingRect.height
    );
    this.size.cameraWorld.size.set(
      this.size.normalizedWorld.size.x * this.camera.visibleSize.width,
      this.size.normalizedWorld.size.y * this.camera.visibleSize.height
    );
    this.size.scaledWorld.size.set(this.size.cameraWorld.size.x / size.x, this.size.cameraWorld.size.y / size.y, 1);
    this.size.scaledWorld.size.z = this.size.scaledWorld.size.y * (size.x / size.y / (this.boundingRect.width / this.boundingRect.height));
    this.size.scaledWorld.position.set(
      this.size.normalizedWorld.position.x * this.camera.visibleSize.width,
      this.size.normalizedWorld.position.y * this.camera.visibleSize.height,
      0
    );
  }
  /**
   * Compute and set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
   */
  setWorldSizes() {
    this.computeWorldSizes();
    this.setWorldScale();
    this.setWorldTransformOrigin();
  }
  /**
   * Set the {@link worldScale} accounting for scaled world size and {@link DOMObjectDepthScaleRatio}
   */
  setWorldScale() {
    __privateGet(this, _DOMObjectWorldScale).set(
      this.size.scaledWorld.size.x,
      this.size.scaledWorld.size.y,
      this.size.scaledWorld.size.z * __privateGet(this, _DOMObjectDepthScaleRatio)
    );
    this.shouldUpdateMatrixStack();
  }
  /**
   * Set {@link DOMObjectDepthScaleRatio}. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis.
   * @param value - depth scale ratio value to use
   */
  set DOMObjectDepthScaleRatio(value) {
    __privateSet(this, _DOMObjectDepthScaleRatio, value);
    this.setWorldScale();
  }
  /**
   * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
   */
  setWorldTransformOrigin() {
    this.transforms.origin.world = new Vec3(
      (this.transformOrigin.x * 2 - 1) * // between -1 and 1
      __privateGet(this, _DOMObjectWorldScale).x,
      -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
      __privateGet(this, _DOMObjectWorldScale).y,
      this.transformOrigin.z * __privateGet(this, _DOMObjectWorldScale).z
    );
    this.shouldUpdateMatrixStack();
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
   * Callback to execute just after the {@link domElement} has been resized.
   * @param callback - callback to run just after {@link domElement} has been resized
   * @returns - our {@link DOMObject3D}
   */
  onAfterDOMElementResize(callback) {
    if (callback) {
      this._onAfterDOMElementResizeCallback = callback;
    }
    return this;
  }
  /**
   * Destroy our {@link DOMObject3D}
   */
  destroy() {
    super.destroy();
    this.domElement?.destroy();
  }
}
_DOMObjectWorldPosition = new WeakMap();
_DOMObjectWorldScale = new WeakMap();
_DOMObjectDepthScaleRatio = new WeakMap();

export { DOMObject3D };
