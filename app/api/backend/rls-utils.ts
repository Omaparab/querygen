/**
 * Row-Level Security SQL injection utility.
 * Pure synchronous helper — NOT a server action.
 *
 * Injects WHERE filters into SELECT queries based on active row policies.
 * Called by executeQuery() in rbac.ts after fetching policies from DB.
 */

/**
 * Injects row-level WHERE filters into a SQL SELECT query.
 *
 * Strategy:
 *  1. Parse table references from FROM and JOIN clauses (simple regex, handles aliases).
 *  2. For each table with an active policy, inject: AND "alias"."col" = 'val'
 *  3. If no WHERE clause exists, add one.
 *  4. Non-SELECT statements are returned untouched.
 */
export function injectRowFilters(
  sql: string,
  policies: Map<string, { col: string; val: string }>
): { sql: string; appliedPolicies: string[] } {
  if (policies.size === 0) return { sql, appliedPolicies: [] };

  const upperSQL = sql.toUpperCase();
  if (!/^\s*SELECT\b/.test(upperSQL)) return { sql, appliedPolicies: [] };

  const appliedPolicies: string[] = [];

  // Extract table references: FROM/JOIN <table> [AS <alias>]
  // Handles plain names, double-quoted names, and backtick-quoted names.
  // Uses negative lookahead to prevent SQL keywords (JOIN, ON, WHERE, etc) from being parsed as aliases.
  const tableRefRe =
    /(?:FROM|JOIN)\s+(?:`([^`]+)`|"([^"]+)"|([a-z_][a-z0-9_]*))(?:\s+(?:AS\s+)?(?:`([^`]+)`|"([^"]+)"|(?!WHERE\b|JOIN\b|ON\b|GROUP\b|ORDER\b|HAVING\b|LIMIT\b|INNER\b|OUTER\b|LEFT\b|RIGHT\b|CROSS\b|NATURAL\b|USING\b|AS\b)([a-z_][a-z0-9_]*)))?/gi;

  let match: RegExpExecArray | null;
  const tableRefs: { table: string; alias: string }[] = [];

  while ((match = tableRefRe.exec(sql)) !== null) {
    const table = (match[1] ?? match[2] ?? match[3] ?? "").toLowerCase();
    const aliasRaw = match[4] ?? match[5] ?? match[6];
    const alias = aliasRaw?.toLowerCase() ?? table;
    if (table) tableRefs.push({ table, alias });
  }

  // Build filter clauses for matched tables
  const filters: string[] = [];
  for (const { table, alias } of tableRefs) {
    const policy = policies.get(table);
    if (policy) {
      // Use MySQL backtick quoting for identifiers
      filters.push(
        `\`${alias}\`.\`${policy.col}\` = '${policy.val.replace(/'/g, "''")}'`
      );
      appliedPolicies.push(`${table}.${policy.col}=${policy.val}`);
    }
  }

  if (filters.length === 0) return { sql, appliedPolicies: [] };

  const filterClause = filters.join(" AND ");

  // Determine where to inject: before GROUP BY / ORDER BY / LIMIT / HAVING
  const groupByRe = /\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING|UNION|INTERSECT|EXCEPT)\b/i;
  const whereRe   = /\bWHERE\b/i;

  if (whereRe.test(sql)) {
    // Append to existing WHERE clause
    const groupMatch = groupByRe.exec(sql);
    if (groupMatch) {
      const idx = groupMatch.index;
      return {
        sql: sql.slice(0, idx) + `AND ${filterClause} ` + sql.slice(idx),
        appliedPolicies,
      };
    }
    return { sql: sql + ` AND ${filterClause}`, appliedPolicies };
  } else {
    // No WHERE — add one
    const groupMatch = groupByRe.exec(sql);
    if (groupMatch) {
      const idx = groupMatch.index;
      return {
        sql: sql.slice(0, idx) + `WHERE ${filterClause} ` + sql.slice(idx),
        appliedPolicies,
      };
    }
    return { sql: sql + ` WHERE ${filterClause}`, appliedPolicies };
  }
}
