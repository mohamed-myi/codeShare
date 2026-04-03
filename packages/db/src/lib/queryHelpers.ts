/**
 * Standard SQL condition for filtering out soft-deleted records.
 */
export const SOFT_DELETE_FILTER = "deleted_at IS NULL";

/**
 * Builds a WHERE clause combining soft delete filter with additional conditions.
 *
 * @param conditions - Additional WHERE conditions
 * @returns Combined WHERE clause
 */
export function buildNonDeletedWhere(conditions: string[]): string {
  return [...conditions, SOFT_DELETE_FILTER].join(" AND ");
}
