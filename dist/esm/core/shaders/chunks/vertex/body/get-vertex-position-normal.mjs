import { getMorphTargets } from './get-morph-targets.mjs';
import { getVertexSkinnedPositionNormal } from './get-vertex-skinned-position-normal.mjs';

const getVertexPositionNormal = ({ bindings = [], geometry }) => {
  let output = "";
  output += getMorphTargets({ bindings, geometry });
  output += /* wgsl */
  `
  var worldPosition: vec4f = vec4(position, 1.0);
  `;
  output += getVertexSkinnedPositionNormal({ bindings, geometry });
  return output;
};

export { getVertexPositionNormal };
