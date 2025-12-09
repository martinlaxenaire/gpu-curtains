const getIBLVolumeRefraction = ({
  transmissionBackgroundTexture = null,
  transmissiveInputColorSpace = "srgb",
  transmissiveInputToneMapping = "Khronos",
  extensionsUsed = []
}) => {
  const hasDispersion = extensionsUsed.includes("KHR_materials_dispersion");
  const iblVolumeRefractionFunction = hasDispersion ? "getIBLVolumeRefractionWithDispersion" : "getIBLVolumeRefraction";
  const availableToneMappings = [false, "Khronos", "Reinhard", "Cineon"];
  const transmissiveToneMapping = availableToneMappings.findIndex((t) => t === transmissiveInputToneMapping);
  return transmissionBackgroundTexture ? (
    /* wgsl */
    `
  var transmissionAlpha: f32 = 1.0;

  let isTransmissiveLinear: bool = ${transmissiveInputColorSpace === "linear" ? "true" : "false"};
  let transmissiveToneMapping: u32 = ${transmissiveToneMapping};
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    viewDirection,
    roughness, 
    diffuseContribution,
    fab,
    specularColorBlended,
    specularF90,
    worldPosition,
    modelScale,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    isTransmissiveLinear,
    transmissiveToneMapping,
    ${transmissionBackgroundTexture.texture.options.name},
    ${transmissionBackgroundTexture.sampler.name},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
  ) : "";
};

export { getIBLVolumeRefraction };
