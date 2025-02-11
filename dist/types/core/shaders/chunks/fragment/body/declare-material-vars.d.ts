import { EnvironmentMap } from '../../../../../extras/environmentMap/EnvironmentMap';
import { ShadingModels } from '../../../../../extras/meshes/LitMesh';
import { UnlitFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/** Parameters used to declare the fragment shader variables coming from the material uniforms. */
export interface DeclareMaterialVarsParams {
    /** The {@link core/bindings/BufferBinding.BufferBindingBaseParams | BufferBindingBaseParams} holding the material uniform values. Will use default values if not provided. */
    materialUniform?: UnlitFragmentShaderInputParams['materialUniform'];
    /** The {@link core/bindings/BufferBinding.BufferBindingBaseParams | BufferBindingBaseParams} name to use for variables declarations. Default to `'material'`. */
    materialUniformName?: UnlitFragmentShaderInputParams['materialUniformName'];
    /** The {@link ShadingModels} to use to declare the corresponding variables. Default to `'PBR'`. */
    shadingModel?: ShadingModels;
    /** {@link EnvironmentMap} to use for specific environment map variables declarations if any.
     @returns - String with all the `material` variables declared. */
    environmentMap?: EnvironmentMap;
}
/**
 * Helper used to declare all available material variables.
 * @param parameters - {@link DeclareMaterialVarsParams} used to declare the material variables.
 * @returns - A string with all the material variables declared.
 */
export declare const declareMaterialVars: ({ materialUniform, materialUniformName, shadingModel, environmentMap, }?: DeclareMaterialVarsParams) => string;
