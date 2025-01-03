import { isCameraRenderer } from '../../renderers/utils.mjs';
import { DOMFrustum } from '../../DOM/DOMFrustum.mjs';
import { MeshBaseMixin } from './MeshBaseMixin.mjs';
import default_projected_vsWgsl from '../../shaders/chunks/default/default_projected_vs.wgsl.mjs';
import default_normal_fsWgsl from '../../shaders/chunks/default/default_normal_fs.wgsl.mjs';
import { getPCFDirectionalShadows, getPCFShadowContribution, getPCFPointShadows, getPCFPointShadowContribution } from '../../shaders/chunks/shading/shadows.mjs';
import { BufferBinding } from '../../bindings/BufferBinding.mjs';

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
    /**
     * Set or reset this Mesh {@link renderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      super.setRenderer(renderer);
      this.camera = this.renderer.camera;
      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.addShadowCastingMesh(this);
          }
        });
      }
    }
    /**
     * Assign or remove a {@link RenderBundle} to this Mesh.
     * @param renderBundle - The {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
     * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
     */
    setRenderBundle(renderBundle, updateScene = true) {
      if (this.renderBundle && renderBundle && this.renderBundle.uuid === renderBundle.uuid)
        return;
      const hasRenderBundle = !!this.renderBundle;
      const bindGroup = this.material.getBindGroupByBindingName("matrices");
      const matrices = this.material.getBufferBindingByName("matrices");
      if (this.renderBundle && !renderBundle && matrices.parent) {
        matrices.parent = null;
        matrices.shouldResetBindGroup = true;
        bindGroup.createBindingBuffer(matrices);
      }
      super.setRenderBundle(renderBundle, updateScene);
      if (this.renderBundle && this.renderBundle.binding) {
        if (hasRenderBundle) {
          bindGroup.destroyBufferBinding(matrices);
        }
        matrices.options.offset = this.renderBundle.meshes.size - 1;
        matrices.parent = this.renderBundle.binding;
        matrices.shouldResetBindGroup = true;
      }
    }
    /**
     * Reset the {@link BufferBinding | matrices buffer binding} parent and offset and tell its bind group to update.
     * @param offset - New offset to use in the parent {@link RenderBundle#binding | RenderBundle binding}.
     */
    patchRenderBundleBinding(offset = 0) {
      const matrices = this.material.getBufferBindingByName("matrices");
      matrices.options.offset = offset;
      matrices.parent = this.renderBundle.binding;
      matrices.shouldResetBindGroup = true;
    }
    /* SHADERS */
    /**
     * Set default shaders if one or both of them are missing.
     * Can also patch the fragment shader if the mesh should receive shadows.
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
      if (this.options.receiveShadows) {
        const hasActiveShadows = this.renderer.shadowCastingLights.find((light) => light.shadow.isActive);
        if (hasActiveShadows && shaders.fragment && typeof shaders.fragment === "object") {
          shaders.fragment.code = getPCFDirectionalShadows(this.renderer) + getPCFShadowContribution + getPCFPointShadows(this.renderer) + getPCFPointShadowContribution + shaders.fragment.code;
        }
      }
      return shaders;
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
        name: "matrices",
        visibility: ["vertex"],
        minOffset: this.renderer.device.limits.minUniformBufferOffsetAlignment,
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
        }
      };
      if (this.options.renderBundle && this.options.renderBundle.binding) {
        matricesUniforms.parent = this.options.renderBundle.binding;
        matricesUniforms.offset = this.options.renderBundle.meshes.size;
      }
      const meshTransformationBinding = new BufferBinding(matricesUniforms);
      if (!meshParameters.bindings)
        meshParameters.bindings = [];
      meshParameters.bindings.unshift(meshTransformationBinding);
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
