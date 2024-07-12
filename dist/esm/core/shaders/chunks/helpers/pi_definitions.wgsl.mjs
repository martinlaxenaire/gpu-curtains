var pi_definitions = (
  /* wgsl */
  `
const PI = ${Math.PI};
const RECIPROCAL_PI = ${1 / Math.PI};`
);

export { pi_definitions as default };
