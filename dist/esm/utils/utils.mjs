//#region src/utils/utils.ts
/**
* Generate a unique universal id
* @returns - unique universal id generated
*/
const generateUUID = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = Math.random() * 16 | 0;
		return (c === "x" ? r : r & 3 | 8).toString(16).toUpperCase();
	});
};
/**
* Turns a string into a camel case string
* @param string - string to transform
* @returns - camel case string created
*/
const toCamelCase = (string) => {
	return string.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, "");
};
/**
* Turns a string into a kebab case string
* @param string - string to transform
* @returns - kebab case string created
*/
const toKebabCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
let warningThrown = 0;
/**
* Throw a console warning with the passed arguments
* @param warning - warning to be thrown
*/
const throwWarning = (warning) => {
	if (warningThrown > 100) return;
	else if (warningThrown === 100) console.warn("GPUCurtains: too many warnings thrown, stop logging.");
	else console.warn(warning);
	warningThrown++;
};
/**
* Throw a javascript error with the passed arguments
* @param error - error to be thrown
*/
const throwError = (error) => {
	throw new Error(error);
};
//#endregion
export { generateUUID, throwError, throwWarning, toCamelCase, toKebabCase };
