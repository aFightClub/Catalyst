import { ErasedElement } from "../types";

// Convert legacy erased elements to new format during migration
export const migrateErasedElements = (elements: any[]): ErasedElement[] => {
  return elements.map((element) => {
    // Check if it's already in the new format
    if (element.domain) {
      return element;
    }

    // Convert from old format to new format
    try {
      const url = new URL(element.url);
      return {
        url: element.url,
        domain: url.hostname.replace("www.", ""),
        selector: element.selector,
      };
    } catch (error) {
      // Fallback if URL parsing fails
      return {
        url: element.url,
        domain: element.url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0],
        selector: element.selector,
      };
    }
  });
};
