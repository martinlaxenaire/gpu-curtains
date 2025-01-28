import { EnvironmentMap } from '../../../../../extras/environment-map/EnvironmentMap';
/**
 * Helper used to declare all available `material` variables.
 * @param environmentMap - {@link EnvironmentMap} to use for specific environment map variables declarations if any.
 * @returns - String with all the `material` variables declared.
 */
export declare const declareMaterialVars: ({ environmentMap }?: {
    environmentMap?: EnvironmentMap;
}) => string;
