import { throwWarning } from "../../utils/utils.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Object3D } from "../../core/objects3D/Object3D.mjs";
import { isCameraRenderer, isProjectedMesh } from "../../core/renderers/utils.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
//#region src/extras/raycaster/Raycaster.ts
/**
* Utility to help with raycasting (determining what objects in the 3d space the mouse is over).
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
* // create a mesh with a box geometry
* // will use the normals colors as default shading
* const mesh = new Mesh(gpuCurtains, {
*   label: 'My mesh',
*   geometry: new BoxGeometry(),
* })
*
* const raycaster = new Raycaster(gpuCurtains)
*
* window.addEventListener('mousemove', (e) => {
*   raycaster.setFromMouse(e)
*
*   const intersections = raycaster.intersectObject(mesh)
*
*   if(intersections.length) {
*     // the mouse is hovering the mesh
*     mesh.scale.set(1.25)
*   } else {
*     // the mouse is not hovering the mesh
*     mesh.scale.set(1)
*   }
* })
* ```
*/
var Raycaster = class {
	/** @ignore */
	#localRay;
	/** @ignore */
	#v0;
	/** @ignore */
	#v1;
	/** @ignore */
	#v2;
	/** @ignore */
	#edge1;
	/** @ignore */
	#edge2;
	/** @ignore */
	#uv0;
	/** @ignore */
	#uv1;
	/** @ignore */
	#uv2;
	/** @ignore */
	#n0;
	/** @ignore */
	#n1;
	/** @ignore */
	#n2;
	/**
	* Raycaster constructor
	* @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Raycaster}
	*/
	constructor(renderer) {
		this.type = "Raycaster";
		this.setRenderer(renderer);
		this.pointer = new Vec2(Infinity);
		this.ray = {
			origin: new Vec3(),
			direction: new Vec3()
		};
		this.#localRay = {
			origin: this.ray.origin.clone(),
			direction: this.ray.direction.clone()
		};
		this.#v0 = new Vec3();
		this.#v1 = new Vec3();
		this.#v2 = new Vec3();
		this.#edge1 = new Vec3();
		this.#edge2 = new Vec3();
		this.#uv0 = new Vec2();
		this.#uv1 = new Vec2();
		this.#uv2 = new Vec2();
		this.#n0 = new Vec3();
		this.#n1 = new Vec3();
		this.#n2 = new Vec3();
	}
	/**
	* Set or reset this {@link Raycaster} {@link Raycaster.renderer | renderer}.
	* @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
	*/
	setRenderer(renderer) {
		renderer = isCameraRenderer(renderer, this.type);
		this.renderer = renderer;
		this.camera = this.renderer.camera;
	}
	/**
	* Set the {@link pointer} normalized device coordinates values (in the [-1, 1] range) based on a mouse/pointer/touch event and the {@link CameraRenderer#boundingRect | renderer bounding rectangle}. Useful if the canvas has a fixed position for example, but you might need to directly use {@link setFromNDCCoords} if not.
	* @param e - Mouse, pointer or touch event.
	*/
	setFromMouse(e) {
		const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e;
		this.setFromNDCCoords((clientX - this.renderer.boundingRect.left) / this.renderer.boundingRect.width * 2 - 1, -((clientY - this.renderer.boundingRect.top) / this.renderer.boundingRect.height) * 2 + 1);
	}
	/**
	* Set the {@link pointer} normalized device coordinates (in the [-1, 1] range).
	* @param x - input position along the X axis in the [-1, 1] range where `-1` represents the left edge and `1` the right edge.
	* @param y - input position along the Y axis in the [-1, 1] range where `-1` represents the bottom edge and `1` the top edge.
	*/
	setFromNDCCoords(x = 0, y = 0) {
		this.pointer.set(x, y);
		this.setRay();
	}
	/**
	* Sets the {@link ray} origin and direction based on the {@link camera} and the normalized device coordinates of the {@link pointer}.
	*/
	setRay() {
		this.camera.worldMatrix.getTranslation(this.ray.origin);
		this.ray.direction.set(this.pointer.x, this.pointer.y, -1).unproject(this.camera).sub(this.ray.origin).normalize();
	}
	/**
	* Ray-Triangle Intersection with Möller–Trumbore Algorithm.
	* @param intersectionPoint - {@link Vec3} to store the intersection point if any.
	* @returns - Whether an intersection point has been found or not.
	*/
	rayIntersectsTriangle(intersectionPoint) {
		const EPSILON = 1e-6;
		const h = new Vec3();
		const q = new Vec3();
		h.crossVectors(this.#localRay.direction, this.#edge2);
		const a = this.#edge1.dot(h);
		if (Math.abs(a) < EPSILON) return false;
		const f = 1 / a;
		const s = this.#localRay.origin.clone().sub(this.#v0);
		const u = f * s.dot(h);
		if (u < 0 || u > 1) return false;
		q.crossVectors(s, this.#edge1);
		const v = f * this.#localRay.direction.dot(q);
		if (v < 0 || u + v > 1) return false;
		const t = f * this.#edge2.dot(q);
		if (t > EPSILON) {
			intersectionPoint.copy(this.#localRay.origin).add(this.#localRay.direction.clone().multiplyScalar(t));
			return true;
		}
		return false;
	}
	/**
	* Find the barycentric contributions of a given intersection point lying inside our current triangle.
	* @param intersectionPoint - Given {@link Vec3 | intersection point}.
	* @returns - {@link Vec3} barycentric contributions.
	*/
	getBarycentricCoordinates(intersectionPoint) {
		const v0p = intersectionPoint.clone().sub(this.#v0);
		const d00 = this.#edge1.dot(this.#edge1);
		const d01 = this.#edge1.dot(this.#edge2);
		const d11 = this.#edge2.dot(this.#edge2);
		const d20 = v0p.dot(this.#edge1);
		const d21 = v0p.dot(this.#edge2);
		const denom = d00 * d11 - d01 * d01;
		const barycentric = new Vec3(0, (d11 * d20 - d01 * d21) / denom, (d00 * d21 - d01 * d20) / denom);
		barycentric.x = 1 - barycentric.y - barycentric.z;
		return barycentric;
	}
	/**
	* Get a rough estimation of the current normal of our current triangle, in local space.
	* @returns - {@link Vec3} normal.
	*/
	getTriangleNormal() {
		return new Vec3().crossVectors(this.#edge1, this.#edge2).normalize();
	}
	/**
	* Set our input vector with the desired attribute value at the given offset defined by our triangleIndex, offset and whether we're using and indexed geometry or not.
	* @param triangleIndex - Index of the triangle for which to look our attribute value.
	* @param offset - Index of the point inside our triangle (`0`, `1` or `2`).
	* @param indices - Indexed geometry array if defined or `null`.
	* @param attribute - {@link VertexBufferAttribute | Vertex buffer attribute} to get the value from.
	* @param vector - Input vector to set (can either be a {@link Vec2} or {@link Vec3}).
	*/
	setAttributeVectorAtIndex(triangleIndex, offset, indices, attribute, vector) {
		const index = indices ? indices[triangleIndex * 3 + offset] : triangleIndex * 3 + offset;
		vector.x = attribute.array[index * attribute.size];
		vector.y = attribute.array[index * attribute.size + 1];
		if ("z" in vector) vector.z = attribute.array[index * attribute.size + 2];
	}
	/**
	* Test whether the {@link ray} is intersecting a given {@link ProjectedMesh | projected mesh} and if so, returns the given {@link Intersection | intersection} information.
	* Uses various early exits to optimize the process:
	* - if the mesh is frustum culled
	* - if the pointer is currently outside the mesh clip space bounding rectangle.
	* - based on the face culling.
	* @param mesh - {@link ProjectedMesh | Projected mesh} to test against.
	* @param intersections - Already existing {@link Intersection | intersections} if any.
	* @returns - Updated {@link Intersection | intersections}.
	* @private
	*/
	#intersectMesh(mesh, intersections = []) {
		if (!mesh.geometry) return intersections;
		const position = mesh.geometry.getAttributeByName("position");
		if (!position) {
			if (!this.renderer.production) throwWarning(`Raycaster: can't raycast on a mesh that has no position attribute: ${mesh.options.label}`);
			return intersections;
		}
		if (!position.array) {
			if (!this.renderer.production) throwWarning(`Raycaster: can't raycast on a mesh that has no position attribute array: ${mesh.options.label}`);
			return intersections;
		}
		if (mesh.frustumCulling && mesh.domFrustum) {
			const { clipSpaceBoundingRect } = mesh.domFrustum;
			if (!mesh.domFrustum.isIntersecting) return intersections;
			else if (this.pointer.x > clipSpaceBoundingRect.left + clipSpaceBoundingRect.width || this.pointer.x < clipSpaceBoundingRect.left || this.pointer.y > clipSpaceBoundingRect.top || this.pointer.y < clipSpaceBoundingRect.top - clipSpaceBoundingRect.height) return intersections;
		}
		const inverseModelMatrix = mesh.worldMatrix.getInverse();
		this.#localRay.origin.copy(this.ray.origin).applyMat4(inverseModelMatrix);
		this.#localRay.direction.copy(this.ray.direction).transformDirection(inverseModelMatrix);
		const uv = mesh.geometry.getAttributeByName("uv");
		const normal = mesh.geometry.getAttributeByName("normal");
		const indices = mesh.geometry.indexBuffer?.array;
		const triangleCount = indices ? indices.length / 3 : position.array.length / 9;
		for (let i = 0; i < triangleCount; i++) {
			this.setAttributeVectorAtIndex(i, 0, indices, position, this.#v0);
			this.setAttributeVectorAtIndex(i, 1, indices, position, this.#v1);
			this.setAttributeVectorAtIndex(i, 2, indices, position, this.#v2);
			this.#edge1.copy(this.#v1).sub(this.#v0);
			this.#edge2.copy(this.#v2).sub(this.#v0);
			if (mesh.material.options.rendering.cullMode !== "none") {
				const faceDirection = this.getTriangleNormal().dot(this.#localRay.direction);
				if (faceDirection > 0 && mesh.material.options.rendering.cullMode === "back") continue;
				else if (faceDirection < 0 && mesh.material.options.rendering.cullMode === "front") continue;
			}
			const intersectionPoint = new Vec3();
			if (this.rayIntersectsTriangle(intersectionPoint)) {
				const barycentric = this.getBarycentricCoordinates(intersectionPoint);
				const point = intersectionPoint.clone().applyMat4(mesh.worldMatrix);
				const intersection = {
					object: mesh,
					distance: this.ray.origin.distance(point),
					localPoint: intersectionPoint,
					point,
					triangle: [
						this.#v0.clone(),
						this.#v1.clone(),
						this.#v2.clone()
					],
					triangleIndex: i
				};
				if (uv && uv.array && uv.array.length) {
					this.setAttributeVectorAtIndex(i, 0, indices, uv, this.#uv0);
					this.setAttributeVectorAtIndex(i, 1, indices, uv, this.#uv1);
					this.setAttributeVectorAtIndex(i, 2, indices, uv, this.#uv2);
					intersection.uv = this.#uv0.clone().multiplyScalar(barycentric.x).add(this.#uv1.clone().multiplyScalar(barycentric.y)).add(this.#uv2.clone().multiplyScalar(barycentric.z));
				}
				if (normal && normal.array && normal.array.length) {
					this.setAttributeVectorAtIndex(i, 0, indices, normal, this.#n0);
					this.setAttributeVectorAtIndex(i, 1, indices, normal, this.#n1);
					this.setAttributeVectorAtIndex(i, 2, indices, normal, this.#n2);
					intersection.normal = this.#n0.clone().multiplyScalar(barycentric.x).add(this.#n1.clone().multiplyScalar(barycentric.y)).add(this.#n2.clone().multiplyScalar(barycentric.z));
				}
				intersections.push(intersection);
			}
		}
		return intersections;
	}
	/**
	* Test whether the {@link ray} is intersecting a given object, if the is object is actually a {@link ProjectedMesh | projected mesh}.
	* Then, if the recursive flag is set to `true`, test if the {@link Object3D#children | object's children} are intersecting as well.
	* @param object - {@link Object3D | object} to test against.
	* @param recursive - Whether we should also test against the {@link Object3D#children | object's children}. Default to `true`.
	* @param intersections - Already existing {@link Intersection | intersections} if any.
	* @returns - Updated {@link Intersection | intersections}.
	*/
	intersectObject(object, recursive = true, intersections = []) {
		if (!(object instanceof Object3D)) {
			if (!this.renderer.production) throwWarning(`${this.type}: object to test intersection again is not of type Object3D`);
			return intersections;
		}
		const mesh = isProjectedMesh(object);
		if (mesh) this.#intersectMesh(mesh, intersections);
		if (recursive) object.children.forEach((child) => {
			this.intersectObject(child, recursive, intersections);
		});
		if (intersections.length) intersections.sort((a, b) => {
			return this.ray.origin.distance(a.point) - this.ray.origin.distance(b.point);
		});
		return intersections;
	}
	/**
	* Test whether the {@link ray} is intersecting a given array of objects.
	* If the recursive flag is set to `true`, test if each {@link Object3D#children | object's children} are intersecting as well.
	* @param objects - Array of {@link Object3D | objects} to test against.
	* @param recursive - Whether we should also test against each {@link Object3D#children | object's children}. Default to `true`.
	* @param intersections - Already existing {@link Intersection | intersections} if any.
	* @returns - Updated {@link Intersection | intersections}.
	*/
	intersectObjects(objects, recursive = true, intersections = []) {
		objects.forEach((object) => {
			this.intersectObject(object, recursive, intersections);
		});
		if (intersections.length) intersections.sort((a, b) => {
			return this.ray.origin.distance(a.point) - this.ray.origin.distance(b.point);
		});
		return intersections;
	}
};
//#endregion
export { Raycaster };
