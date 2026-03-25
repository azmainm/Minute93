export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
