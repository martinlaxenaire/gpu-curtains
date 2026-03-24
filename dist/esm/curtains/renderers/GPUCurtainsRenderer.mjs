import { GPUCameraRenderer } from "../../core/renderers/GPUCameraRenderer.mjs";
//#region src/curtains/renderers/GPUCurtainsRenderer.ts
/**
* This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes}
*
* @example
* ```javascript
* // first, we need a WebGPU device, that's what GPUDeviceManager is for
* const gpuDeviceManager = new GPUDeviceManager({
*   label: 'Custom device manager',
* })
*
* // we need to wait for the WebGPU device to be created
* await gpuDeviceManager.init()
*
* // then we can create a curtains renderer
* const gpuCurtainsRenderer = new GPUCurtainsRenderer({
*   deviceManager: gpuDeviceManager, // we need the WebGPU device to create the renderer context
*   container: document.querySelector('#canvas'),
* })
* ```
* @template TCamera - The camera type parameter which extends {@link RendererCamera}. Default is {@link PerspectiveCamera}.
*/
var GPUCurtainsRenderer = class extends GPUCameraRenderer {
	/**
	* GPUCurtainsRenderer constructor
	* @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}.
	*/
	constructor({ deviceManager, label, container, pixelRatio = 1, autoResize = true, context = {}, renderPass, camera, lights }) {
		super({
			deviceManager,
			label,
			container,
			pixelRatio,
			autoResize,
			context,
			renderPass,
			camera,
			lights
		});
		this.type = "GPUCurtainsRenderer";
	}
	/**
	* Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements.
	*/
	setRendererObjects() {
		super.setRendererObjects();
		this.domMeshes = [];
		this.domObjects = [];
		this.domTextures = [];
	}
	/**
	* Add a {@link DOMTexture} to our {@link domTextures | DOM textures array}.
	* @param texture - {@link DOMTexture} to add.
	*/
	addDOMTexture(texture) {
		this.domTextures.push(texture);
	}
	/**
	* Remove a {@link DOMTexture} from our {@link domTextures | textures array}.
	* @param texture - {@link DOMTexture} to remove.
	*/
	removeDOMTexture(texture) {
		this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid);
	}
	/**
	* Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/cameras/PerspectiveCamera.PerspectiveCamera#position | position} or {@link core/cameras/PerspectiveCamera.PerspectiveCamera#size | size} changed.
	*/
	onCameraMatricesChanged() {
		super.onCameraMatricesChanged();
		this.domObjects.forEach((domObject) => {
			domObject.updateSizeAndPosition();
		});
	}
	/**
	* Resize the {@link meshes}.
	*/
	resizeMeshes() {
		this.meshes.forEach((mesh) => {
			if (!("domElement" in mesh)) mesh.resize(this.boundingRect);
		});
		this.domObjects.forEach((domObject) => {
			if (!domObject.domElement.isResizing) domObject.domElement.setSize();
		});
	}
};
//#endregion
export { GPUCurtainsRenderer };
