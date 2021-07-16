
const camelToSnake = (key) => {
  return key.replace( /([A-Z])/g, "_$1").toLowerCase();
}

/**
 * converts and objects keys from camelCase to snake_case
 * @param obj - original object
 * @returns {Object}
 */
export const objectKeysCamelToSnake = (obj) => {
  const newObject = {}
  for(let camel in obj) {
    newObject[camelToSnake(camel)] = obj[camel]
  }
  return newObject
}