
/**
 * Capitalizes the first letter of each word (Title Case)
 * Useful for Names, Species, Breeds, etc.
 */
export const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Capitalizes the first letter of the string (Sentence Case)
 * Useful for Notes, Descriptions, etc.
 */
export const toSentenceCase = (str: string): string => {
    if (!str) return '';
    const trimmed = str.trim();
    if (trimmed.length === 0) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};
