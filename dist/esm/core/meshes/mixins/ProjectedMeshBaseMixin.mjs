import { isCameraRenderer } from '../../renderers/utils.mjs';
import { DOMFrustum } from '../../DOM/DOMFrustum.mjs';
import { MeshBaseMixin } from './MeshBaseMixin.mjs';
import default_projected_vsWgsl from '../../shaders/chunks/default/default_projected_vs.wgsl.mjs';
import default_normal_fsWgsl from '../../shaders/chunks/default/default_normal_fs.wgsl.mjs';
import { getPCFDirectionalShadows, getPCFShadowContribution, getPCFPointShadows, getPCFPointShadowContribution } from '../../shaders/chunks/shading/shadows.mjs';

const defaultProjectedMeshParams = {
  // frustum culling and visibility
  frustumCulling: "OBB",
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  receiveShadows: false,
  castShadows: false
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
      renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      const { frustumCulling, DOMFrustumMargins, receiveShadows, castShadows } = parameters;
      this.options = {
        ...this.options ?? {},
        // merge possible lower options?
        frustumCulling,
        DOMFrustumMargins,
        receiveShadows,
        castShadows
      };
      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.addShadowCastingMesh(this);
          }
        });
      }
      this.setDOMFrustum();
    }
    /* SHADERS */
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      const { shaders } = this.options;
      if (!shaders) {
        this.options.shaders = {
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
     * Set or update the Projected Mesh {@link Geometry}
     * @param geometry - new {@link Geometry} to use
     */
    useGeometry(geometry) {
      super.useGeometry(geometry);
      if (this.domFrustum) {
        this.domFrustum.boundingBox = this.geometry.boundingBox;
      }
      this.shouldUpdateMatrixStack();
    }
    /**
     * Set the Mesh frustum culling
     */
    setDOMFrustum() {
      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry?.boundingBox,
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
      this.frustumCulling = this.options.frustumCulling;
    }
    /* MATERIAL */
    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.frustumCulling;
      delete parameters.DOMFrustumMargins;
      if (this.options.receiveShadows) {
        const depthTextures = [];
        let depthSamplers = [];
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            depthTextures.push(light.shadow.depthTexture);
            depthSamplers.push(light.shadow.depthComparisonSampler);
          }
        });
        const hasActiveShadows = this.renderer.shadowCastingLights.find((light) => light.shadow.isActive);
        if (hasActiveShadows && parameters.shaders.fragment && typeof parameters.shaders.fragment === "object") {
          parameters.shaders.fragment.code = getPCFDirectionalShadows(this.renderer) + getPCFShadowContribution + getPCFPointShadows(this.renderer) + getPCFPointShadowContribution + parameters.shaders.fragment.code;
        }
        depthSamplers = depthSamplers.filter(
          (sampler, i, array) => array.findIndex((s) => s.uuid === sampler.uuid) === i
        );
        if (parameters.textures) {
          parameters.textures = [...parameters.textures, ...depthTextures];
        } else {
          parameters.textures = depthTextures;
        }
        if (parameters.samplers) {
          parameters.samplers = [...parameters.samplers, ...depthSamplers];
        } else {
          parameters.samplers = depthSamplers;
        }
      }
      return super.cleanupRenderMaterialParameters(parameters);
    }
    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters) {
      const matricesUniforms = {
        label: "Matrices",
        visibility: ["vertex"],
        struct: {
          model: {
            type: "mat4x4f",
            value: this.worldMatrix
          },
          modelView: {
            // model view matrix (world matrix multiplied by camera view matrix)
            type: "mat4x4f",
            value: this.modelViewMatrix
          },
          normal: {
            // normal matrix
            type: "mat3x3f",
            value: this.normalMatrix
          }
          // modelViewProjection: {
          //   type: 'mat4x4f',
          //   value: this.modelViewProjectionMatrix,
          // },
        }
      };
      if (!meshParameters.uniforms)
        meshParameters.uniforms = {};
      meshParameters.uniforms = { matrices: matricesUniforms, ...meshParameters.uniforms };
      super.setMaterial(meshParameters);
    }
    /**
     * Get the visible property value
     */
    get visible() {
      return this._visible;
    }
    /**
     * Set the visible property value
     * @param value - new visibility value
     */
    set visible(value) {
      this.shouldUpdateMatrixStack();
      this._visible = value;
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
      for (const texture of this.domTextures) {
        texture.resize();
      }
    }
    /**
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
     */
    get projectedBoundingRect() {
      return this.domFrustum?.projectedBoundingRect;
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
     * Get the geometry bounding sphere in clip space.
     * @readonly
     */
    get clipSpaceBoundingSphere() {
      const { center, radius, min, max } = this.geometry.boundingBox;
      const translation = this.worldMatrix.getTranslation();
      const maxWorldRadius = radius * this.worldMatrix.getMaxScaleOnAxis();
      const cMin = center.clone().add(translation);
      cMin.z += min.z;
      const cMax = center.clone().add(translation);
      cMax.z += max.z;
      const sMin = cMin.clone();
      sMin.y += maxWorldRadius;
      const sMax = cMax.clone();
      sMax.y += maxWorldRadius;
      cMin.applyMat4(this.camera.viewProjectionMatrix);
      cMax.applyMat4(this.camera.viewProjectionMatrix);
      sMin.applyMat4(this.camera.viewProjectionMatrix);
      sMax.applyMat4(this.camera.viewProjectionMatrix);
      const rMin = cMin.distance(sMin);
      const rMax = cMax.distance(sMax);
      const rectMin = {
        xMin: cMin.x - rMin,
        xMax: cMin.x + rMin,
        yMin: cMin.y - rMin,
        yMax: cMin.y + rMin
      };
      const rectMax = {
        xMin: cMax.x - rMax,
        xMax: cMax.x + rMax,
        yMin: cMax.y - rMax,
        yMax: cMax.y + rMax
      };
      const rect = {
        xMin: Math.min(rectMin.xMin, rectMax.xMin),
        yMin: Math.min(rectMin.yMin, rectMax.yMin),
        xMax: Math.max(rectMin.xMax, rectMax.xMax),
        yMax: Math.max(rectMin.yMax, rectMax.yMax)
      };
      const sphereCenter = cMax.add(cMin).multiplyScalar(0.5).clone();
      sphereCenter.x = (rect.xMax + rect.xMin) / 2;
      sphereCenter.y = (rect.yMax + rect.yMin) / 2;
      const sphereRadius = Math.max(rect.xMax - rect.xMin, rect.yMax - rect.yMin) * 0.5;
      return {
        center: sphereCenter,
        radius: sphereRadius
      };
    }
    /**
     * Check if the Mesh lies inside the {@link camera} view frustum or not using the test defined by {@link frustumCulling}.
     */
    checkFrustumCulling() {
      if (this.matricesNeedUpdate) {
        if (this.domFrustum && this.frustumCulling) {
          if (this.frustumCulling === "sphere") {
            this.domFrustum.setDocumentCoordsFromClipSpaceSphere(this.clipSpaceBoundingSphere);
          } else {
            this.domFrustum.setDocumentCoordsFromClipSpaceOBB();
          }
          this.domFrustum.intersectsContainer();
        }
      }
    }
    /**
     * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
     */
    onBeforeRenderPass() {
      if (this.material && this.matricesNeedUpdate) {
        this.material.shouldUpdateInputsBindings("matrices");
      }
      super.onBeforeRenderPass();
    }
    /**
     * Render our Mesh if the {@link RenderMaterial} is ready and if it is not frustum culled.
     * @param pass - current render pass
     */
    onRenderPass(pass) {
      if (!this.ready)
        return;
      this._onRenderCallback && this._onRenderCallback();
      if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulling) {
        this.material.render(pass);
        this.geometry.render(pass);
      }
    }
    destroy() {
      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.removeMesh(this);
          }
        });
      }
      super.destroy();
    }
  };
}

export { ProjectedMeshBaseMixin };
