/**
 * Generate a unique universal id
 * @returns - unique universal id generated
 */
export declare const generateUUID: () => string;
/**
 * Turns a string into a camel case string
 * @param string - string to transform
 * @returns - camel case string created
 */
export declare const toCamelCase: (string: string) => string;
/**
 * Turns a string into a kebab case string
 * @param string - string to transform
 * @returns - kebab case string created
 */
export declare const toKebabCase: (string: string) => string;
/**
 * Throw a console warning with the passed arguments
 * @param warning - warning to be thrown
 */
export declare const throwWarning: (warning: string) => void;
/**
 * Throw a javascript error with the passed arguments
 * @param error - error to be thrown
 */
export declare const throwError: (error: string) => never;
