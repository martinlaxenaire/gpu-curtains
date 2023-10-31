/// <reference types="dist" />
import { MaterialInputBindingsParams, MaterialShaders, ShaderOptions } from './Material';
import { Geometry } from '../../../core/geometries/Geometry';
import { IndexedGeometry } from '../../../core/geometries/IndexedGeometry';
import { PlaneGeometry } from '../../../core/geometries/PlaneGeometry';
export interface RenderShaders {
    vertex: ShaderOptions;
    fragment: ShaderOptions;
}
export type RenderShadersOptions = Partial<RenderShaders>;
export interface RenderMaterialAttributes {
    wgslStructFragment?: Geometry['wgslStructFragment'];
    verticesCount?: Geometry['verticesCount'];
    instancesCount?: Geometry['instancesCount'];
    verticesOrder?: Geometry['verticesOrder'];
    vertexBuffers?: Geometry['vertexBuffers'];
}
export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry;
export interface RenderMaterialBaseRenderingOptions {
    useProjection: boolean;
    transparent: boolean;
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
    cullMode: GPUCullMode;
}
export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
    verticesOrder: Geometry['verticesOrder'];
}
export interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {
}
export interface RenderMaterialParams extends Partial<RenderMaterialBaseParams> {
    label?: string;
    shaders?: MaterialShaders;
    geometry: AllowedGeometries;
    useAsyncPipeline?: boolean;
}
