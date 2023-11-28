export declare const generateUUID: () => string;
export declare const toCamelCase: (string: string) => string;
export declare const toKebabCase: (string: string) => string;
export declare const throwWarning: (warning: string) => void;
/***
 Log a console error with the passed arguments
 ***/
export declare const logError: (error: string) => void;
/***
 Throw a javascript error with the passed arguments
 ***/
export declare const throwError: (error: string) => never;
