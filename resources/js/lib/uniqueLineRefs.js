/**
 * Prevent the same article_ref twice in one document (case-insensitive).
 */

export function normalizeArticleRef(ref) {
    return String(ref ?? '').trim().toLowerCase();
}

/**
 * @param {Array} lines
 * @param {(line: any) => string} getRef
 * @returns {string|null} duplicated display ref, or null
 */
export function findDuplicateArticleRef(lines, getRef = (l) => l.article_ref) {
    const seen = new Map();
    for (const line of lines) {
        const raw = getRef(line);
        const key = normalizeArticleRef(raw);
        if (!key) continue;
        if (seen.has(key)) return String(raw).trim() || key;
        seen.set(key, true);
    }
    return null;
}

export const DUPLICATE_REF_MESSAGE = 'Cette référence est déjà saisie sur une autre ligne.';

/**
 * Refs already used by other lines (excluding current line key).
 */
export function usedArticleRefs(lines, currentKey, getRef = (l) => l.article_ref) {
    const used = new Set();
    for (const line of lines) {
        if (line.key === currentKey) continue;
        const key = normalizeArticleRef(getRef(line));
        if (key) used.add(key);
    }
    return used;
}
