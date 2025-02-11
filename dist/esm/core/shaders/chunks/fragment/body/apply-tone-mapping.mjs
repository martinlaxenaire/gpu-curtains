const applyToneMapping = ({ toneMapping = "Khronos" } = {}) => {
  let toneMappingOutput = (
    /* wgsl */
    `
  let exposure: f32 = 1.0; // TODO
  outputColor *= exposure;
  `
  );
  toneMappingOutput += (() => {
    switch (toneMapping) {
      case "Khronos":
        return (
          /* wgsl */
          `
  outputColor = vec4(KhronosToneMapping(outputColor.rgb), outputColor.a);
  `
        );
      case "Reinhard":
        return `
  outputColor = vec4(ReinhardToneMapping(outputColor.rgb), outputColor.a);
        `;
      case "Cineon":
        return `
  outputColor = vec4(CineonToneMapping(outputColor.rgb), outputColor.a);
        `;
      case false:
      default:
        return `
  outputColor = saturate(outputColor);
        `;
    }
  })();
  toneMappingOutput += /* wgsl */
  `
  outputColor = linearTosRGB_4(outputColor);
  `;
  return toneMappingOutput;
};

export { applyToneMapping };
