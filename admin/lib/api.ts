import type {
  ApiResponse,
  PaginatedData,
  Store,
  Table,
  Category,
  Product,
  Order,
  Printer,
  Staff,
  AdminWithStore,
  LoginResponse,
  StoreListParams,
  TableListParams,
  CategoryListParams,
  ProductListParams,
  OrderListParams,
  PrinterListParams,
  StaffListParams,
  CreateStoreRequest,
  UpdateStoreRequest,
  CreateTableRequest,
  BatchCreateTablesRequest,
  UpdateTableRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateProductRequest,
  UpdateProductRequest,
  CreatePrinterRequest,
  UpdatePrinterRequest,
  CreateStaffRequest,
  UpdateStaffRequest,
  DashboardOverview,
  SalesChartItem,
  TopProduct,
  CategoryStats,
  ProductStatus,
  OrderStatus,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private buildQuery<T extends object>(params?: T): string {
    if (!params) return "";
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const token = this.getToken();
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await res.json();

    if (data.code !== 200) {
      throw new Error(data.message || "请求失败");
    }

    return data.data;
  }

  // ==================== Auth ====================

  login(username: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
  }

  getMe(): Promise<AdminWithStore> {
    return this.request<AdminWithStore>("/api/auth/me");
  }

  // ==================== Stores ====================

  getStores(params?: StoreListParams): Promise<PaginatedData<Store>> {
    return this.request<PaginatedData<Store>>(`/api/stores${this.buildQuery(params)}`);
  }

  getStore(
    id: number
  ): Promise<Store & { tables: Table[]; categories: Category[]; printers: Printer[] }> {
    return this.request(`/api/stores/${id}`);
  }

  createStore(data: CreateStoreRequest): Promise<Store> {
    return this.request<Store>("/api/stores", { method: "POST", body: data });
  }

  updateStore(id: number, data: UpdateStoreRequest): Promise<Store> {
    return this.request<Store>(`/api/stores/${id}`, { method: "PUT", body: data });
  }

  deleteStore(id: number): Promise<null> {
    return this.request<null>(`/api/stores/${id}`, { method: "DELETE" });
  }

  // ==================== Tables ====================

  getTables(params?: TableListParams): Promise<PaginatedData<Table>> {
    return this.request<PaginatedData<Table>>(`/api/tables${this.buildQuery(params)}`);
  }

  getTable(id: number): Promise<Table> {
    return this.request<Table>(`/api/tables/${id}`);
  }

  createTable(data: CreateTableRequest): Promise<Table> {
    return this.request<Table>("/api/tables", { method: "POST", body: data });
  }

  createTablesBatch(data: BatchCreateTablesRequest): Promise<{ count: number }> {
    return this.request<{ count: number }>("/api/tables/batch", { method: "POST", body: data });
  }

  updateTable(id: number, data: UpdateTableRequest): Promise<Table> {
    return this.request<Table>(`/api/tables/${id}`, { method: "PUT", body: data });
  }

  regenerateQrCode(id: number): Promise<Table> {
    return this.request<Table>(`/api/tables/${id}/qrcode`, { method: "PUT" });
  }

  deleteTable(id: number): Promise<null> {
    return this.request<null>(`/api/tables/${id}`, { method: "DELETE" });
  }

  // ==================== Categories ====================

  getCategories(params?: CategoryListParams): Promise<PaginatedData<Category>> {
    return this.request<PaginatedData<Category>>(`/api/categories${this.buildQuery(params)}`);
  }

  getCategory(id: number): Promise<Category> {
    return this.request<Category>(`/api/categories/${id}`);
  }

  createCategory(data: CreateCategoryRequest): Promise<Category> {
    return this.request<Category>("/api/categories", { method: "POST", body: data });
  }

  updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
    return this.request<Category>(`/api/categories/${id}`, { method: "PUT", body: data });
  }

  deleteCategory(id: number): Promise<null> {
    return this.request<null>(`/api/categories/${id}`, { method: "DELETE" });
  }

  // ==================== Products ====================

  getProducts(params?: ProductListParams): Promise<PaginatedData<Product>> {
    return this.request<PaginatedData<Product>>(`/api/products${this.buildQuery(params)}`);
  }

  getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`);
  }

  createProduct(data: CreateProductRequest): Promise<Product> {
    return this.request<Product>("/api/products", { method: "POST", body: data });
  }

  updateProduct(id: number, data: UpdateProductRequest): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`, { method: "PUT", body: data });
  }

  updateProductStatus(id: number, status: ProductStatus): Promise<Product> {
    return this.request<Product>(`/api/products/${id}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  deleteProduct(id: number): Promise<null> {
    return this.request<null>(`/api/products/${id}`, { method: "DELETE" });
  }

  // ==================== Orders ====================

  getOrders(params?: OrderListParams): Promise<PaginatedData<Order>> {
    return this.request<PaginatedData<Order>>(`/api/orders${this.buildQuery(params)}`);
  }

  getOrder(id: number): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}`);
  }

  updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  refundOrder(id: number, reason?: string): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}/refund`, {
      method: "POST",
      body: { reason },
    });
  }

  getTodayStats(
    storeId?: number
  ): Promise<{ orderCount: number; revenue: number; pendingOrders: Order[] }> {
    return this.request(`/api/orders/today/stats${this.buildQuery({ storeId })}`);
  }

  // ==================== Printers ====================

  getPrinters(params?: PrinterListParams): Promise<PaginatedData<Printer>> {
    return this.request<PaginatedData<Printer>>(`/api/printers${this.buildQuery(params)}`);
  }

  getPrinter(id: number): Promise<Printer> {
    return this.request<Printer>(`/api/printers/${id}`);
  }

  createPrinter(data: CreatePrinterRequest): Promise<Printer> {
    return this.request<Printer>("/api/printers", { method: "POST", body: data });
  }

  updatePrinter(id: number, data: UpdatePrinterRequest): Promise<Printer> {
    return this.request<Printer>(`/api/printers/${id}`, { method: "PUT", body: data });
  }

  testPrinter(id: number): Promise<null> {
    return this.request<null>(`/api/printers/${id}/test`, { method: "POST" });
  }

  bindPrinterCategories(id: number, categoryIds: number[]): Promise<null> {
    return this.request<null>(`/api/printers/${id}/bind`, {
      method: "POST",
      body: { categoryIds },
    });
  }

  deletePrinter(id: number): Promise<null> {
    return this.request<null>(`/api/printers/${id}`, { method: "DELETE" });
  }

  // ==================== Dashboard ====================

  getDashboardOverview(storeId?: number): Promise<DashboardOverview> {
    return this.request<DashboardOverview>(
      `/api/dashboard/overview${this.buildQuery({ storeId })}`
    );
  }

  getSalesChart(storeId?: number, days?: number): Promise<SalesChartItem[]> {
    return this.request<SalesChartItem[]>(
      `/api/dashboard/sales-chart${this.buildQuery({ storeId, days })}`
    );
  }

  getTopProducts(storeId?: number, limit?: number): Promise<TopProduct[]> {
    return this.request<TopProduct[]>(
      `/api/dashboard/top-products${this.buildQuery({ storeId, limit })}`
    );
  }

  getRecentOrders(storeId?: number, limit?: number): Promise<Order[]> {
    return this.request<Order[]>(
      `/api/dashboard/recent-orders${this.buildQuery({ storeId, limit })}`
    );
  }

  getCategoryStats(storeId?: number): Promise<CategoryStats[]> {
    return this.request<CategoryStats[]>(
      `/api/dashboard/category-stats${this.buildQuery({ storeId })}`
    );
  }

  // ==================== Staff ====================

  getStaff(params?: StaffListParams): Promise<PaginatedData<Staff>> {
    return this.request<PaginatedData<Staff>>(`/api/staff${this.buildQuery(params)}`);
  }

  getStaffById(id: number): Promise<Staff> {
    return this.request<Staff>(`/api/staff/${id}`);
  }

  createStaff(data: CreateStaffRequest): Promise<Staff> {
    return this.request<Staff>("/api/staff", { method: "POST", body: data });
  }

  updateStaff(id: number, data: UpdateStaffRequest): Promise<Staff> {
    return this.request<Staff>(`/api/staff/${id}`, { method: "PUT", body: data });
  }

  updateStaffStatus(id: number, status: "ACTIVE" | "INACTIVE"): Promise<Staff> {
    return this.request<Staff>(`/api/staff/${id}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  deleteStaff(id: number): Promise<null> {
    return this.request<null>(`/api/staff/${id}`, { method: "DELETE" });
  }

  // ==================== Settings ====================

  getSettings(storeId?: number): Promise<Record<string, { value: string; description: string }>> {
    return this.request(`/api/settings${this.buildQuery({ storeId })}`);
  }

  getSetting(key: string, storeId?: number): Promise<{ key: string; value: string; description: string }> {
    return this.request(`/api/settings/${key}${this.buildQuery({ storeId })}`);
  }

  updateSetting(key: string, value: string, storeId?: number): Promise<unknown> {
    return this.request(`/api/settings/${key}${this.buildQuery({ storeId })}`, {
      method: "PUT",
      body: { value },
    });
  }

  updateSettings(items: { key: string; value: string }[], storeId?: number): Promise<unknown> {
    return this.request(`/api/settings${this.buildQuery({ storeId })}`, {
      method: "PUT",
      body: { items },
    });
  }

  resetSetting(key: string, storeId?: number): Promise<null> {
    return this.request<null>(`/api/settings/${key}${this.buildQuery({ storeId })}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
