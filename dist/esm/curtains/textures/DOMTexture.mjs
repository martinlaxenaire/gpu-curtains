import { isCurtainsRenderer } from "../../core/renderers/utils.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
import { Mat3 } from "../../math/Mat3.mjs";
import { MediaTexture } from "../../core/textures/MediaTexture.mjs";
//#region src/curtains/textures/DOMTexture.ts
/** @const - default {@link DOMTexture} parameters */
const defaultDOMTextureParams = {
	name: "texture",
	generateMips: false,
	flipY: false,
	format: "rgba8unorm",
	premultipliedAlpha: false,
	placeholderColor: [
		0,
		0,
		0,
		255
	],
	useExternalTextures: true,
	fromTexture: null,
	visibility: ["fragment"],
	cache: true
};
/**
* Used to create {@link GPUTexture} or {@link GPUExternalTexture}, specially made to handle different kinds of DOM elements {@link TextureSource | sources}, like {@link HTMLImageElement}, {@link HTMLVideoElement} or {@link HTMLCanvasElement}.
*
* Handles the various sources loading and uploading, GPU textures creation,{@link BufferBinding | texture model matrix binding} and {@link TextureBinding | GPU texture binding}.
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
* // create a DOM texture
* const imageTexture = new DOMTexture(gpuCurtains, {
*   label: 'My image texture',
*   name: 'imageTexture',
* })
*
* // load an image
* await imageTexture.loadImage(document.querySelector('img'))
* ```
*/
var DOMTexture = class extends MediaTexture {
	/**
	* {@link Vec2} used for {@link modelMatrix} calculations, based on {@link mesh} {@link core/DOM/DOMElement.RectSize | size}.
	* @private
	*/
	#parentRatio = new Vec2(1);
	/**
	* {@link Vec2} used for {@link modelMatrix} calculations, based on {@link size | source size}.
	* @private
	*/
	#sourceRatio = new Vec2(1);
	/**
	* {@link Vec2} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio.
	* @private
	*/
	#coverScale = new Vec2(1);
	/**
	* {@link Vec2} used for {@link modelMatrix} calculations, based on {@link transformOrigin}.
	* @private
	*/
	#negatedOrigin = new Vec2();
	/**
	* Rotation {@link Mat3} based on texture {@link rotation}.
	* @private
	*/
	#rotationMatrix = new Mat3();
	/**
	* DOMTexture constructor
	* @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
	* @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
	*/
	constructor(renderer, parameters = defaultDOMTextureParams) {
		renderer = isCurtainsRenderer(renderer, "DOMTexture");
		super(renderer, {
			...parameters,
			useTransform: true,
			viewDimension: "2d"
		});
		this._mesh = null;
		this.transformOrigin.set(.5, .5);
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
			this.#parentRatio.set(parentRatio, 1);
			this.#sourceRatio.set(1 / sourceRatio, 1);
		} else {
			this.#parentRatio.set(1, 1 / parentRatio);
			this.#sourceRatio.set(1, sourceRatio);
		}
		const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? this.#parentRatio.x * this.#sourceRatio.x : this.#sourceRatio.y * this.#parentRatio.y;
		this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y));
		this.#negatedOrigin.copy(this.transformOrigin).multiplyScalar(-1);
		this.#rotationMatrix.rotateByAngleZ(this.rotation);
		this.modelMatrix.identity().premultiplyTranslate(this.#negatedOrigin).premultiplyScale(this.#coverScale).premultiplyScale(this.#parentRatio).premultiply(this.#rotationMatrix).premultiplyScale(this.#sourceRatio).premultiplyTranslate(this.transformOrigin).translate(this.offset);
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
		super.resize();
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
	/**
	* Destroy the {@link DOMTexture}.
	*/
	destroy() {
		this.renderer.removeDOMTexture(this);
		super.destroy();
	}
};
//#endregion
export { DOMTexture };
