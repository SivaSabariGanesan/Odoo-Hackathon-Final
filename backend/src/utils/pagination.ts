// ─── Pagination helpers ───────────────────────────────────────────────────────

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export function parsePagination(input: PaginationInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, limit: pageSize, offset };
}

export function buildMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
