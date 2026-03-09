// ---------------------------------------------------------------------------
// ID Generation Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a unique identifier using crypto.randomUUID().
 * An optional prefix is prepended with an underscore separator.
 *
 * @param prefix - Optional string prepended to the UUID (e.g. "node", "edge")
 * @returns A unique string like "node_a1b2c3d4-..."
 */
export function generateId(prefix?: string): string {
  const uuid = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Shorthand for generating a node identifier.
 */
export function generateNodeId(): string {
  return generateId('node');
}

/**
 * Shorthand for generating an edge identifier.
 */
export function generateEdgeId(): string {
  return generateId('edge');
}
