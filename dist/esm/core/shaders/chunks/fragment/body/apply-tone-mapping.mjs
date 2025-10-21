const applyToneMapping = ({
  toneMapping = "Khronos",
  outputColorSpace = "srgb"
} = {}) => {
  let toneMappingOutput = (
    /* wgsl */
    `
  let exposure: f32 = 1.0; // TODO?
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
        return (
          /* wgsl */
          `
  outputColor = vec4(ReinhardToneMapping(outputColor.rgb), outputColor.a);
        `
        );
      case "Cineon":
        return (
          /* wgsl */
          `
  outputColor = vec4(CineonToneMapping(outputColor.rgb), outputColor.a);
        `
        );
      case false:
      default:
        return (
          /* wgsl */
          `
  outputColor = saturate(outputColor);
        `
        );
    }
  })();
  if (outputColorSpace === "srgb") {
    toneMappingOutput += /* wgsl */
    `
  outputColor = linearTosRGB_4(outputColor);
    `;
  }
  return toneMappingOutput;
};

export { applyToneMapping };
