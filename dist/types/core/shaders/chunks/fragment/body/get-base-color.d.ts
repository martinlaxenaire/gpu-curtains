import { Geometry } from '../../../../geometries/Geometry';
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Get the base color from the `material` binding `baseColorFactor` value, {@link Geometry} colors attributes if any and `baseColorTexture` if any, and apply it to our `outputColor`. Can also discard fragments based on `material` binding `alphaCutoff` value.
 * {@link https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#reference-material-pbrmetallicroughness | See glTF PBR metallic roughness} definition and default values.
 * @param parameters - Parameters to use to set the base color.
 * @param parameters.geometry - {@link Geometry} to use to check for colors attributes.
 * @param parameters.baseColorTexture - {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any.
 * @returns - A string with base color applied to `outputColor`.
 */
export declare const getBaseColor: ({ geometry, baseColorTexture, }?: {
    geometry?: Geometry;
    baseColorTexture?: ShaderTextureDescriptor;
}) => string;
