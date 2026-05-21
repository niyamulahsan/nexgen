import { count, getTableColumns, type SQL } from "drizzle-orm";
import { db } from "@/framework/database/connection.js";

type PaginateOptions = {
  page?: number;
  perPage?: number;
  maxPerPage?: number;
  path?: string;
  where?: SQL<unknown>;
  orderBy?: unknown[];
};

type RequestLike = {
  req: {
    query: (key: string) => string | undefined;
    path: string;
    url?: string;
  };
};

type PaginateQueryOptions<T> = {
  page?: number;
  perPage?: number;
  maxPerPage?: number;
  path?: string;
  total: () => Promise<number>;
  data: (limit: number, offset: number) => Promise<T[]>;
};

export type PaginatedResult<T> = {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{ url: string | null; label: string; page: number | null; active: boolean; }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function pageUrl(path: string, page: number, perPage: number) {
  if (!path) return null;
  const delimiter = path.includes("?") ? "&" : "?";
  return `${path}${delimiter}page=${page}&per_page=${perPage}`;
}

/**
 * Why: Generic paginator for custom total/data callbacks.
 * When: You need pagination outside direct table helpers.
 * Where: Controllers/services composing complex queries.
 * How: Normalizes page params, computes URLs/meta, and executes callbacks.
 */
export async function paginateQuery<T = any>(
  options: PaginateQueryOptions<T>
): Promise<PaginatedResult<T>> {
  const maxPerPage = toPositiveInt(options.maxPerPage, 100);
  const perPage = Math.min(toPositiveInt(options.perPage, 15), maxPerPage);
  const page = toPositiveInt(options.page, 1);

  const total = Number(await options.total());
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, lastPage);
  const safeOffset = (currentPage - 1) * perPage;
  const data = await options.data(perPage, safeOffset);

  const from = total === 0 ? null : safeOffset + 1;
  const to = total === 0 ? null : safeOffset + data.length;
  const path = options.path || "";
  const firstPageUrl = pageUrl(path, 1, perPage);
  const lastPageUrl = pageUrl(path, lastPage, perPage);
  const prevPageUrl = currentPage > 1 ? pageUrl(path, currentPage - 1, perPage) : null;
  const nextPageUrl = currentPage < lastPage ? pageUrl(path, currentPage + 1, perPage) : null;

  const links: Array<{ url: string | null; label: string; page: number | null; active: boolean; }> =
    [
      {
        url: prevPageUrl,
        label: "&laquo; Previous",
        page: currentPage > 1 ? currentPage - 1 : null,
        active: false
      }
    ];

  for (let p = 1; p <= lastPage; p += 1) {
    links.push({
      url: pageUrl(path, p, perPage),
      label: String(p),
      page: p,
      active: p === currentPage
    });
  }

  links.push({
    url: nextPageUrl,
    label: "Next &raquo;",
    page: currentPage < lastPage ? currentPage + 1 : null,
    active: false
  });

  return {
    current_page: currentPage,
    data,
    first_page_url: firstPageUrl,
    from,
    last_page: lastPage,
    last_page_url: lastPageUrl,
    links,
    next_page_url: nextPageUrl,
    path,
    per_page: perPage,
    prev_page_url: prevPageUrl,
    to,
    total
  };
}

/**
 * Why: Paginates a Drizzle query using request query params.
 * When: Route handlers receive `page/per_page` from client.
 * Where: API controllers returning list resources.
 * How: Builds count subquery and applies limit/offset to source query.
 */
export async function paginate<T = any>(
  c: RequestLike,
  query: any,
  perPage = 15,
  options: { maxPerPage?: number; path?: string; } = {}
): Promise<PaginatedResult<T>> {
  const page = Number(c.req.query("page") || 1);
  const size = c.req.query("size");
  const perPageQuery = c.req.query("per_page");
  const perPageValue = Number(size || perPageQuery || perPage);
  const fallbackPath = c.req.path;
  const resolvedPath = (() => {
    if (options.path) return options.path;
    if (!c.req.url) return fallbackPath;
    try {
      const parsed = new URL(c.req.url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return fallbackPath;
    }
  })();

  const queryForCount = query.as("paginate_rows");

  return paginateQuery<T>({
    page,
    perPage: perPageValue,
    maxPerPage: options.maxPerPage,
    path: resolvedPath,
    total: async () => {
      const totalRow = await db.select({ total: count() }).from(queryForCount);
      return Number(totalRow[0]?.total ?? 0);
    },
    data: (limit, offset) => query.limit(limit).offset(offset)
  });
}

/**
 * Why: Paginates a full table with optional filters/sorting.
 * When: CRUD list endpoints need simple table pagination.
 * Where: Service/controller code for table resources.
 * How: Runs total + paged select with where/order options.
 */
export async function paginateTable<T = any>(
  db: any,
  table: any,
  options: PaginateOptions = {}
): Promise<PaginatedResult<T>> {
  return paginateQuery<T>({
    page: options.page,
    perPage: options.perPage,
    maxPerPage: options.maxPerPage,
    path: options.path,
    total: async () => {
      let totalQuery = db.select({ total: count() }).from(table);
      if (options.where) totalQuery = totalQuery.where(options.where);
      const totalRow = await totalQuery;
      return Number(totalRow[0]?.total ?? 0);
    },
    data: async (limit, offset) => {
      let dataQuery = db.select(getTableColumns(table)).from(table);
      if (options.where) dataQuery = dataQuery.where(options.where);
      if (options.orderBy?.length) dataQuery = dataQuery.orderBy(...options.orderBy);
      return dataQuery.limit(limit).offset(offset);
    }
  });
}
