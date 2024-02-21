import { isCameraRenderer } from '../../renderers/utils.mjs';
import { DOMFrustum } from '../../DOM/DOMFrustum.mjs';
import { MeshBaseMixin } from './MeshBaseMixin.mjs';
import default_projected_vsWgsl from '../../shaders/chunks/default_projected_vs.wgsl.mjs';
import default_normal_fsWgsl from '../../shaders/chunks/default_normal_fs.wgsl.mjs';

const defaultProjectedMeshParams = {
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
};
function ProjectedMeshBaseMixin(Base) {
  return class ProjectedMeshBase extends MeshBaseMixin(Base) {
    /**
     * ProjectedMeshBase constructor
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
     * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
     * @property {ProjectedMeshParameters} 2 - Projected Mesh parameters
     *
     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params) {
      super(
        params[0],
        params[1],
        { ...defaultProjectedMeshParams, ...params[2], ...{ useProjection: true } }
      );
      // callbacks / events
      /** function assigned to the {@link onReEnterView} callback */
      this._onReEnterViewCallback = () => {
      };
      /** function assigned to the {@link onLeaveView} callback */
      this._onLeaveViewCallback = () => {
      };
      let renderer = params[0];
      const parameters = {
        ...defaultProjectedMeshParams,
        ...params[2],
        ...{ useProjection: true }
      };
      this.type = "MeshTransformed";
      renderer = renderer && renderer.renderer || renderer;
      isCameraRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      const { geometry, frustumCulled, DOMFrustumMargins } = parameters;
      this.options = {
        ...this.options ?? {},
        // merge possible lower options?
        frustumCulled,
        DOMFrustumMargins
      };
      this.setDOMFrustum();
      this.geometry = geometry;
      this.shouldUpdateMatrixStack();
    }
    /* SHADERS */
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      let { shaders } = this.options;
      if (!shaders) {
        shaders = {
          vertex: {
            code: default_projected_vsWgsl,
            entryPoint: "main"
          },
          fragment: {
            code: default_normal_fsWgsl,
            entryPoint: "main"
          }
        };
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: default_projected_vsWgsl,
            entryPoint: "main"
          };
        }
        if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
          shaders.fragment = {
            code: default_normal_fsWgsl,
            entryPoint: "main"
          };
        }
      }
    }
    /* GEOMETRY */
    /**
     * Set the Mesh frustum culling
     */
    setDOMFrustum() {
      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.boundingRect,
        DOMFrustumMargins: this.options.DOMFrustumMargins,
        onReEnterView: () => {
          this._onReEnterViewCallback && this._onReEnterViewCallback();
        },
        onLeaveView: () => {
          this._onLeaveViewCallback && this._onLeaveViewCallback();
        }
      });
      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins;
      this.frustumCulled = this.options.frustumCulled;
      this.domFrustum.shouldUpdate = this.frustumCulled;
    }
    /* MATERIAL */
    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link ProjectedRenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters) {
      const { frustumCulled, DOMFrustumMargins, ...materialParameters } = meshParameters;
      const matricesUniforms = {
        label: "Matrices",
        struct: {
          model: {
            name: "model",
            type: "mat4x4f",
            value: this.modelMatrix
          },
          world: {
            name: "world",
            type: "mat4x4f",
            value: this.worldMatrix
          },
          modelView: {
            // model view matrix (world matrix multiplied by camera view matrix)
            name: "modelView",
            type: "mat4x4f",
            value: this.modelViewMatrix
          },
          modelViewProjection: {
            name: "modelViewProjection",
            type: "mat4x4f",
            value: this.modelViewProjectionMatrix
          }
        }
      };
      if (!materialParameters.uniforms)
        materialParameters.uniforms = {};
      materialParameters.uniforms.matrices = matricesUniforms;
      super.setMaterial(materialParameters);
    }
    /* SIZE & TRANSFORMS */
    /**
     * Resize our {@link ProjectedMeshBaseClass}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect) {
      if (this.domFrustum)
        this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect);
      super.resize(boundingRect);
    }
    /**
     * Apply scale and resize textures
     */
    applyScale() {
      super.applyScale();
      this.textures.forEach((texture) => texture.resize());
    }
    /**
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
     */
    get projectedBoundingRect() {
      return this.domFrustum?.projectedBoundingRect;
    }
    /**
     * At least one of the matrix has been updated, update according uniforms and frustum
     */
    onAfterMatrixStackUpdate() {
      if (this.material) {
        this.material.shouldUpdateInputsBindings("matrices");
      }
      if (this.domFrustum)
        this.domFrustum.shouldUpdate = true;
    }
    /* EVENTS */
    /**
     * Assign a callback function to _onReEnterViewCallback
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView(callback) {
      if (callback) {
        this._onReEnterViewCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView(callback) {
      if (callback) {
        this._onLeaveViewCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
     * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
     * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
     * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
     */
    onBeforeRenderPass() {
      this.updateMatrixStack();
      if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords();
        this.domFrustum.shouldUpdate = false;
      }
      super.onBeforeRenderPass();
    }
    /**
     * Only render the Mesh if it is in view frustum.
     * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
     * @param pass - current render pass
     */
    onRenderPass(pass) {
      if (!this.material.ready)
        return;
      this._onRenderCallback && this._onRenderCallback();
      if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulled) {
        this.material.render(pass);
        this.geometry.render(pass);
      }
    }
  };
}

export { ProjectedMeshBaseMixin };
//# sourceMappingURL=ProjectedMeshBaseMixin.mjs.map
