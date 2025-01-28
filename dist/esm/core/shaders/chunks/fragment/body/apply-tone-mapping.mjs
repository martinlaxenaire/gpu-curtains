const applyToneMapping = ({ toneMapping = "Linear" } = {}) => {
  return (() => {
    switch (toneMapping) {
      case "Linear":
        return "outputColor = vec4(linearToOutput3(outputColor.rgb), outputColor.a);";
      case "Khronos":
        return "outputColor = vec4(linearTosRGB(toneMapKhronosPbrNeutral(outputColor.rgb)), outputColor.a);";
      case false:
      default:
        return "";
    }
  })();
};

export { applyToneMapping };
