import { isCameraRenderer } from '../../renderers/utils.mjs';
import { DOMFrustum } from '../../DOM/DOMFrustum.mjs';
import { MeshBaseMixin } from './MeshBaseMixin.mjs';
import { BufferBinding } from '../../bindings/BufferBinding.mjs';
import { getDefaultProjectedVertexShaderCode } from '../../shaders/full/vertex/get-default-projected-vertex-shader-code.mjs';
import { getDefaultNormalFragmentCode } from '../../shaders/full/fragment/get-default-normal-fragment-code.mjs';
import { getPCFDirectionalShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-directional-shadow-contribution.mjs';
import { getPCFDirectionalShadows } from '../../shaders/chunks/fragment/head/get-PCF-directional-shadows.mjs';
import { getPCFPointShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-point-shadow-contribution.mjs';
import { getPCFPointShadows } from '../../shaders/chunks/fragment/head/get-PCF-point-shadows.mjs';
import { Texture } from '../../textures/Texture.mjs';
import { getPCFSpotShadows } from '../../shaders/chunks/fragment/head/get-PCF-spot-shadows.mjs';
import { getPCFSpotShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-spot-shadow-contribution.mjs';
import { getPCFBaseShadowContribution } from '../../shaders/chunks/fragment/head/get-PCF-base-shadow-contribution.mjs';

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
  castShadows: false,
  transmissive: false
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
      const { frustumCulling, DOMFrustumMargins, receiveShadows, castShadows, transmissive } = parameters;
      this.options = {
        ...this.options ?? {},
        // merge possible lower options?
        frustumCulling,
        DOMFrustumMargins,
        receiveShadows,
        castShadows,
        transmissive
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
      if (this.renderer && this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.removeMesh(this);
          }
        });
      }
      if (this.options.transmissive) {
        renderer = isCameraRenderer(renderer, this.options.label + " " + renderer.type);
        renderer.createTransmissionTarget();
        let transmissiveTexture = this.material.textures.find(
          (texture) => texture.options.name === "transmissionBackgroundTexture"
        );
        if (transmissiveTexture) {
          transmissiveTexture.copy(renderer.transmissionTarget.texture);
        }
      }
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
      if (this.renderBundle && renderBundle && this.renderBundle.uuid === renderBundle.uuid) return;
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
            code: getDefaultProjectedVertexShaderCode,
            entryPoint: "main"
          },
          fragment: {
            code: getDefaultNormalFragmentCode,
            entryPoint: "main"
          }
        };
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: getDefaultProjectedVertexShaderCode,
            entryPoint: "main"
          };
        }
        if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
          shaders.fragment = {
            code: getDefaultNormalFragmentCode,
            entryPoint: "main"
          };
        }
      }
      if (this.options.receiveShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          light.shadow.addShadowReceivingMesh(this);
        });
        const hasActiveShadows = this.renderer.shadowCastingLights.find((light) => light.shadow.isActive);
        if (hasActiveShadows && shaders.fragment) {
          shaders.fragment.code = getPCFBaseShadowContribution + getPCFDirectionalShadows(this.renderer) + getPCFDirectionalShadowContribution + getPCFPointShadows(this.renderer) + getPCFPointShadowContribution + getPCFSpotShadows(this.renderer) + getPCFSpotShadowContribution + shaders.fragment.code;
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
      if (this.renderer && this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.updateMeshGeometry(this, geometry);
          }
        });
      }
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
    /**
     * Get whether the Mesh is currently in the {@link camera} frustum.
     * @readonly
     */
    get isInFrustum() {
      return this.domFrustum.isIntersecting;
    }
    /* MATERIAL */
    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.castShadows;
      delete parameters.DOMFrustumMargins;
      delete parameters.frustumCulling;
      delete parameters.receiveShadows;
      delete parameters.transmissive;
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
      if (this.options.transmissive) {
        this.renderer.createTransmissionTarget();
        const transmissionTexture = new Texture(this.renderer, {
          label: this.options.label + " transmission texture",
          name: "transmissionBackgroundTexture",
          fromTexture: this.renderer.transmissionTarget.texture
        });
        if (parameters.textures) {
          parameters.textures = [...parameters.textures, transmissionTexture];
        } else {
          parameters.textures = [transmissionTexture];
        }
        if (parameters.samplers) {
          parameters.samplers = [...parameters.samplers, this.renderer.transmissionTarget.sampler];
        } else {
          parameters.samplers = [this.renderer.transmissionTarget.sampler];
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
        visibility: ["vertex", "fragment"],
        minOffset: this.renderer.device ? this.renderer.device.limits.minUniformBufferOffsetAlignment : 256,
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
      if (!meshParameters.bindings) meshParameters.bindings = [];
      meshParameters.bindings.unshift(meshTransformationBinding);
      super.setMaterial(meshParameters);
    }
    /**
     * Update this Mesh camera {@link BindGroup}. Useful if the Mesh needs to be rendered with a different {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#camera | camera} than the {@link CameraRenderer} one.
     * @param cameraBindGroup - New camera {@link BindGroup} to use. Should be a clon from the {@link CameraRenderer} one.
     */
    setCameraBindGroup(cameraBindGroup) {
      if (this.material && this.material.useCameraBindGroup && this.material.bindGroups.length) {
        this.material.bindGroups[0] = cameraBindGroup;
      }
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
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect);
      super.resize(boundingRect);
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
      if (!this.ready) return;
      if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulling) {
        this.renderPass(pass);
      }
    }
    /**
     * Destroy the Mesh, and handle shadow casting or receiving meshes.
     */
    destroy() {
      if (this.options.castShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive) {
            light.shadow.removeMesh(this);
          }
        });
      }
      if (this.options.receiveShadows) {
        this.renderer.shadowCastingLights.forEach((light) => {
          light.shadow.removeShadowReceivingMesh(this);
        });
      }
      super.destroy();
    }
  };
}

export { ProjectedMeshBaseMixin };
