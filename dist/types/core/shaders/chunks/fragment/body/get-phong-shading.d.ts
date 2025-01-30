/**
 * Set the `outgoingLight` (`vec3f`) using Phong shading.
 * @param parameters - Parameters to use to apply Phong shading.
 * @param parameters.receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @returns - A string with Phong shading applied to `outgoingLight`.
 */
export declare const getPhongShading: ({ receiveShadows }?: {
    receiveShadows?: boolean;
}) => string;
