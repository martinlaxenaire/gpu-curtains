//#region src/core/shaders/chunks/fragment/body/apply-tone-mapping.ts
/**
* Apply the corresponding tone mapping to our `outputColor` (`vec4f`).
* @param parameters - Parameters to use for applying tone mapping.
* @param parameters.toneMapping - {@link ToneMappings} to apply if any. Default to `'Khronos'`.
*/
const applyToneMapping = ({ toneMapping = "Khronos", outputColorSpace = "srgb" } = {}) => {
	let toneMappingOutput = `
  let exposure: f32 = 1.0; // TODO?
  outputColor *= exposure;
  `;
	toneMappingOutput += (() => {
		switch (toneMapping) {
			case "Khronos": return `
  outputColor = vec4(KhronosToneMapping(outputColor.rgb), outputColor.a);
  `;
			case "Reinhard": return `
  outputColor = vec4(ReinhardToneMapping(outputColor.rgb), outputColor.a);
        `;
			case "Cineon": return `
  outputColor = vec4(CineonToneMapping(outputColor.rgb), outputColor.a);
        `;
			default: return `
  outputColor = saturate(outputColor);
        `;
		}
	})();
	if (outputColorSpace === "srgb") toneMappingOutput += `
  outputColor = linearTosRGB_4(outputColor);
    `;
	return toneMappingOutput;
};
//#endregion
export { applyToneMapping };
