/**
 * Set the `outgoingLight` (`vec3f`) using Lambert shading.
 * @param receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @returns - A string with Lambert shading applied to `outgoingLight`.
 */
export declare const getLambertShading: ({ receiveShadows }?: {
    receiveShadows?: boolean;
}) => string;
