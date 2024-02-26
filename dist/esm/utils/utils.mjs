const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === "x" ? r : r & 3 | 8;
    return v.toString(16).toUpperCase();
  });
};
const toCamelCase = (string) => {
  return string.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, "");
};
const toKebabCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
let warningThrown = 0;
const throwWarning = (warning) => {
  if (warningThrown > 100) {
    return;
  } else if (warningThrown === 100) {
    console.warn("GPUCurtains: too many warnings thrown, stop logging.");
  } else {
    console.warn(warning);
  }
  warningThrown++;
};
const throwError = (error) => {
  throw new Error(error);
};

export { generateUUID, throwError, throwWarning, toCamelCase, toKebabCase };
