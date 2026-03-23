import { isRenderer } from "../renderers/utils.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
import { PlaneGeometry } from "../geometries/PlaneGeometry.mjs";
import { MeshBaseMixin } from "./mixins/MeshBaseMixin.mjs";
import { cacheManager } from "../../utils/CacheManager.mjs";
//#region src/core/meshes/FullscreenPlane.ts
/**
* Create a 1x1 quad (or plane) covering the full viewport, useful for postprocessing or background effects.
*
* It consists of a {@link PlaneGeometry} and {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} and a few utilities method to help create {@link core/textures/MediaTexture.MediaTexture | MediaTexture} and {@link core/textures/Texture.Texture | Texture}.
*
* ### Default shaders
*
* If one or all shaders are missing, the library will use default ones.
*
* #### Default vertex shader:
*
* ```wgsl
* struct VSOutput {
*   @builtin(position) position: vec4f,
*   @location(0) uv: vec2f,
* };
*
* @vertex fn main(
*   attributes: Attributes,
* ) -> VSOutput {
*   var vsOutput: VSOutput;
*
*   vsOutput.position = vec4f(attributes.position, 1.0);
*   vsOutput.uv = attributes.uv;
*
*   return vsOutput;
* }
* ```
*
* #### Default fragment shader:
*
* ```wgsl
* @fragment fn main() -> @location(0) vec4f {
*   return vec4(0.0, 0.0, 0.0, 1.0);
* }
* ```
*
* @example
* ```javascript
* // set our main GPUCurtains instance
* const gpuCurtains = new GPUCurtains({
*   container: '#canvas' // selector of our WebGPU canvas container
* })
*
* // set the GPU device
* // note this is asynchronous
* await gpuCurtains.setDevice()
*
* // create a fullscreen plane
* const fullscreenPlane = new FullscreenPlane(gpuCurtains, {
*   label: 'My fullscreen plane',
*   shaders: {
*     fragment: {
*       code: fragmentCode, // assume it is a valid WGSL fragment shader
*     },
*   },
* })
* ```
*/
var FullscreenPlane = class extends MeshBaseMixin(class {}) {
	/**
	* FullscreenPlane constructor
	* @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}.
	* @param parameters - {@link FullscreenPlaneParams | parameters} use to create this {@link FullscreenPlane}.
	*/
	constructor(renderer, parameters = {}) {
		renderer = isRenderer(renderer, parameters.label ? parameters.label + " FullscreenPlane" : "FullscreenPlane");
		let geometry = cacheManager.getPlaneGeometryByID(2);
		if (!geometry) {
			geometry = new PlaneGeometry({
				widthSegments: 1,
				heightSegments: 1
			});
			cacheManager.addPlaneGeometry(geometry);
		}
		if (!parameters.shaders || !parameters.shaders.vertex) ["uniforms", "storages"].forEach((bindingType) => {
			Object.values(parameters[bindingType] ?? {}).forEach((binding) => binding.visibility = ["fragment"]);
		});
		parameters.depthWriteEnabled = false;
		if (!parameters.label) parameters.label = "FullscreenQuadMesh";
		super(renderer, null, {
			geometry,
			...parameters
		});
		this.size = { document: {
			width: this.renderer.boundingRect.width,
			height: this.renderer.boundingRect.height,
			top: this.renderer.boundingRect.top,
			left: this.renderer.boundingRect.left
		} };
		this.type = "FullscreenQuadMesh";
	}
	/**
	* Resize our {@link FullscreenPlane}.
	* @param boundingRect - the new bounding rectangle.
	*/
	resize(boundingRect = null) {
		this.size.document = boundingRect ?? this.renderer.boundingRect;
		super.resize(boundingRect);
	}
	/**
	* Take the pointer {@link Vec2} position relative to the document and returns it relative to our {@link FullscreenPlane}.
	* It ranges from -1 to 1 on both axis.
	* @param mouseCoords - pointer {@link Vec2} coordinates.
	* @returns - the mapped {@link Vec2} coordinates in the [-1, 1] range.
	*/
	mouseToPlaneCoords(mouseCoords = new Vec2()) {
		return new Vec2((mouseCoords.x - this.size.document.left) / this.size.document.width * 2 - 1, 1 - (mouseCoords.y - this.size.document.top) / this.size.document.height * 2);
	}
};
//#endregion
export { FullscreenPlane };
