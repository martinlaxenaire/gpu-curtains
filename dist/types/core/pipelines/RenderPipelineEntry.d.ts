/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryShaders, RenderPipelineEntryOptions, RenderPipelineEntryParams } from '../../types/PipelineEntries';
import { RenderMaterialAttributes } from '../../types/Materials';
/**
 * Used to create a {@link PipelineEntry} specifically designed to handle {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
 *
 * ## Shaders patching
 *
 * The {@link RenderPipelineEntry} uses each of its {@link RenderPipelineEntry#bindGroups | bind groups} {@link core/bindings/Binding.Binding | Binding} to patch the given vertex and fragment shaders before creating the {@link GPUShaderModule}.<br>
 * It will prepend every {@link core/bindings/Binding.Binding | Binding} WGSL code snippets (or fragments) with the correct bind group and bindings indices.
 *
 * ## Pipeline compilation
 *
 * The {@link RenderPipelineEntry} will then create a {@link GPURenderPipeline} (asynchronously by default).
 *
 * ## Default attributes and uniforms
 *
 * ### Attributes
 *
 * Attributes are only added to the vertex shaders. They are generated based on the {@link core/geometries/Geometry.Geometry | Geometry} used and may vary in case you're using a geometry with custom attributes. Here are the default ones:
 *
 * ```wgsl
 * struct Attributes {
 *  @builtin(vertex_index) vertexIndex : u32,
 *  @builtin(instance_index) instanceIndex : u32,
 *  @location(0) position: vec3f,
 *  @location(1) uv: vec2f,
 *  @location(2) normal: vec3f
 * };
 *
 * // you can safely access them in your vertex shader
 * // using attributes.position or attributes.uv for example
 * ```
 *
 * ### Uniforms
 *
 * If the Mesh is one of {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} or {@link curtains/meshes/Plane.Plane | Plane}, some additional uniforms are added to the shaders.
 *
 * #### Vertex shaders
 *
 * ```wgsl
 * struct Matrices {
 * 	model: mat4x4f,
 * 	modelView: mat4x4f,
 * 	normal: mat3x3f
 * };
 *
 * struct Camera {
 * 	view: mat4x4f,
 * 	projection: mat4x4f,
 * 	position: vec3f
 * };
 *
 * @group(0) @binding(0) var<uniform> camera: Camera;
 *
 * // note that matrices uniform @group index might change depending on use cases
 * @group(1) @binding(0) var<uniform> matrices: Matrices;
 *
 * // you can safely access these uniforms in your vertex shader
 * // using matrices.modelView or camera.projection for example
 * ```
 *
 * #### Fragment shaders
 *
 * ```wgsl
 * struct Matrices {
 * 	model: mat4x4f,
 * 	modelView: mat4x4f,
 * 	normal: mat3x3f
 * };
 *
 * // note that matrices uniform @group index might change depending on use cases
 * @group(1) @binding(0) var<uniform> matrices: Matrices;
 *
 * // you can safely access these uniforms in your fragment shader
 * // using matrices.model or matrices.modelView for example
 * ```
 *
 * ### Helpers
 *
 * Finally, some helpers functions are added to the shaders as well.
 *
 * #### Vertex and fragment shaders
 *
 * To help you compute scaled UV based on a texture matrix, this function is always added to both vertex and fragment shaders:
 *
 * ```wgsl
 * fn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {
 *   return (textureMatrix * vec4f(uv, 1.0)).xy;
 * }
 * ```
 *
 * #### Vertex shaders
 *
 * If the Mesh is one of {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} or {@link curtains/meshes/Plane.Plane | Plane}, some functions are added to the vertex shader to help you compute the vertices positions and normals.
 *
 * ##### Position
 *
 * Position helper function:
 *
 * ```wgsl
 * fn getOutputPosition(position: vec3f) -> vec4f {
 *   return camera.projection * matrices.modelView * vec4f(position, 1.0);
 * }
 * ```
 *
 * Note that it is not mandatory to use it. If you want to do these computations yourself, you are free to do it the way you like most. You could for example use this formula instead:
 *
 * ```wgsl
 * var transformed: vec3f = camera.projection * camera.view * matrices.model * vec4f(position, 1.0);
 * ```
 *
 * ##### Normal
 *
 * The normal matrix provided, available as `matrices.normal`, is computed in world space (i.e. it is the inverse transpose of the world matrix). A couple helpers functions are added to help you compute the normals in the right space:
 *
 * ```wgsl
 * fn getWorldNormal(normal: vec3f) -> vec3f {
 *   return normalize(matrices.normal * normal);
 * }
 *
 * fn getViewNormal(normal: vec3f) -> vec3f {
 *   return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
 * }
 * ```
 *
 * #### Fragment shaders
 *
 * Last but not least, those couple functions are added to the fragment shaders to help you convert vertex positions to UV coordinates:
 *
 * ```wgsl
 * fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
 *   return vec2(
 *     vertex.x * 0.5 + 0.5,
 *     0.5 - vertex.y * 0.5
 *   );
 * }
 *
 * fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
 *   return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
 * }
 * ```
 */
export declare class RenderPipelineEntry extends PipelineEntry {
    /** Shaders to use with this {@link RenderPipelineEntry} */
    shaders: PipelineEntryShaders;
    /** {@link RenderMaterialAttributes | Geometry attributes} sent to the {@link RenderPipelineEntry} */
    attributes: RenderMaterialAttributes;
    /** {@link GPUDevice.createRenderPipeline().descriptor | GPURenderPipelineDescriptor} based on {@link layout} and {@link shaders} */
    descriptor: GPURenderPipelineDescriptor | null;
    /** Options used to create this {@link RenderPipelineEntry} */
    options: RenderPipelineEntryOptions;
    /**
     * RenderPipelineEntry constructor
     * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters: RenderPipelineEntryParams);
    /**
     * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders(): void;
    /**
     * Get whether the shaders modules have been created
     * @readonly
     */
    get shadersModulesReady(): boolean;
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders(): void;
    /**
     * Get default transparency blend state.
     * @returns - The default transparency blend state.
     */
    static getDefaultTransparentBlending(): GPUBlendState;
    /**
     * Create the render pipeline {@link descriptor}
     */
    createPipelineDescriptor(): void;
    /**
     * Create the render {@link pipeline}
     */
    createRenderPipeline(): void;
    /**
     * Asynchronously create the render {@link pipeline}
     * @returns - void promise result
     */
    createRenderPipelineAsync(): Promise<void>;
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
     */
    compilePipelineEntry(): Promise<void>;
}
