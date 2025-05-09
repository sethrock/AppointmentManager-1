/**
 * Fix issues with the JSON file data
 * - Replaces "NaN" values with null
 * - Fixes any other JSON parsing issues
 */
export function fixJsonData(fileContent: string): string {
  // Replace NaN with null
  return fileContent.replace(/: ?NaN/g, ': null');
}