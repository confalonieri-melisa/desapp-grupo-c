export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function toPagination(total: number, page: number, limit: number): Pagination {
  return {
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
