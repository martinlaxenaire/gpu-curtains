//#region src/core/shaders/chunks/utils/constants.ts
/**
* Constants to use in shadings.
*/
const constants = `
const PI = ${Math.PI};
const PI2 = ${Math.PI * 2};
const RECIPROCAL_PI = ${1 / Math.PI};
const RECIPROCAL_PI2 = ${.5 / Math.PI};
const EPSILON = 1e-6;`;
//#endregion
export { constants };
