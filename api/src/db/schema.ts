import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  json,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== 枚举类型 ====================

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "OWNER", "STAFF"]);
export const statusEnum = pgEnum("status", ["ACTIVE", "INACTIVE"]);
export const storeStatusEnum = pgEnum("store_status", ["ACTIVE", "CLOSED", "DISABLED"]);
export const tableStatusEnum = pgEnum("table_status", ["FREE", "OCCUPIED", "RESERVED"]);
export const productTypeEnum = pgEnum("product_type", ["SINGLE", "VARIANT"]);
export const productStatusEnum = pgEnum("product_status", ["AVAILABLE", "SOLDOUT", "HIDDEN"]);
export const printerTypeEnum = pgEnum("printer_type", ["KITCHEN", "CASHIER", "BAR"]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PAID",
  "PREPARING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);
export const printJobStatusEnum = pgEnum("print_job_status", [
  "PENDING",
  "PRINTING",
  "SUCCESS",
  "FAILED",
  "DEAD",
]);

// ==================== 用户与管理员 ====================

export const admins = pgTable(
  "admins",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    role: roleEnum("role").notNull().default("STAFF"),
    storeId: integer("store_id").references(() => stores.id),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("admins_username_idx").on(table.username)]
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openid: varchar("openid", { length: 100 }).notNull().unique(),
    unionid: varchar("unionid", { length: 100 }),
    nickname: varchar("nickname", { length: 50 }),
    avatar: varchar("avatar", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("users_openid_idx").on(table.openid)]
);

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    level: integer("level").notNull().default(1),
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("members_user_id_idx").on(table.userId)]
);

// ==================== 门店与桌台 ====================

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  logo: varchar("logo", { length: 255 }),
  status: storeStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tables = pgTable(
  "tables",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    name: varchar("name", { length: 50 }).notNull(),
    capacity: integer("capacity").notNull().default(4),
    qrCode: varchar("qr_code", { length: 100 }).notNull().unique(),
    status: tableStatusEnum("status").notNull().default("FREE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("tables_qr_code_idx").on(table.qrCode),
    index("tables_store_id_idx").on(table.storeId),
  ]
);

// ==================== 商品与分类 ====================

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    name: varchar("name", { length: 50 }).notNull(),
    sort: integer("sort").notNull().default(0),
    icon: varchar("icon", { length: 255 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("categories_store_id_idx").on(table.storeId)]
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 255 }),
    type: productTypeEnum("type").notNull().default("SINGLE"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    sales: integer("sales").notNull().default(0),
    sort: integer("sort").notNull().default(0),
    status: productStatusEnum("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("products_store_id_idx").on(table.storeId),
    index("products_category_id_idx").on(table.categoryId),
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    specs: json("specs").$type<Record<string, string>>().notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").notNull().default(-1),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("product_variants_product_id_idx").on(table.productId)]
);

export const productAttributes = pgTable(
  "product_attributes",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    options: json("options").$type<string[]>().notNull(),
    required: boolean("required").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("product_attributes_product_id_idx").on(table.productId)]
);

// ==================== 打印机 ====================

export const printers = pgTable(
  "printers",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    sn: varchar("sn", { length: 100 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    type: printerTypeEnum("type").notNull().default("KITCHEN"),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("printers_store_id_idx").on(table.storeId)]
);

export const categoryPrinters = pgTable(
  "category_printers",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    printerId: integer("printer_id")
      .notNull()
      .references(() => printers.id, { onDelete: "cascade" }),
  },
  (table) => [index("category_printers_idx").on(table.categoryId, table.printerId)]
);

// ==================== 订单 ====================

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    tableId: integer("table_id")
      .notNull()
      .references(() => tables.id),
    userId: integer("user_id").references(() => users.id),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    payAmount: decimal("pay_amount", { precision: 10, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    payTime: timestamp("pay_time"),
    remark: varchar("remark", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("orders_order_no_idx").on(table.orderNo),
    index("orders_store_id_idx").on(table.storeId),
    index("orders_table_id_idx").on(table.tableId),
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productVariantId: integer("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    snapshot: json("snapshot")
      .$type<{ name: string; categoryName: string; specs: Record<string, string> }>()
      .notNull(),
    attributes: json("attributes").$type<{ name: string; value: string }[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

export const printJobs = pgTable(
  "print_jobs",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    printerId: integer("printer_id")
      .notNull()
      .references(() => printers.id),
    content: json("content").notNull(),
    status: printJobStatusEnum("status").notNull().default("PENDING"),
    retries: integer("retries").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("print_jobs_order_id_idx").on(table.orderId),
    index("print_jobs_status_idx").on(table.status),
  ]
);

// ==================== 关系定义 ====================

export const adminsRelations = relations(admins, ({ one }) => ({
  store: one(stores, { fields: [admins.storeId], references: [stores.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  member: one(members, { fields: [users.id], references: [members.userId] }),
  orders: many(orders),
}));

export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  admins: many(admins),
  tables: many(tables),
  categories: many(categories),
  products: many(products),
  printers: many(printers),
  orders: many(orders),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  store: one(stores, { fields: [tables.storeId], references: [stores.id] }),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
  products: many(products),
  printers: many(categoryPrinters),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  attributes: many(productAttributes),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, { fields: [productAttributes.productId], references: [products.id] }),
}));

export const printersRelations = relations(printers, ({ one, many }) => ({
  store: one(stores, { fields: [printers.storeId], references: [stores.id] }),
  categories: many(categoryPrinters),
  printJobs: many(printJobs),
}));

export const categoryPrintersRelations = relations(categoryPrinters, ({ one }) => ({
  category: one(categories, { fields: [categoryPrinters.categoryId], references: [categories.id] }),
  printer: one(printers, { fields: [categoryPrinters.printerId], references: [printers.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  table: one(tables, { fields: [orders.tableId], references: [tables.id] }),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  printJobs: many(printJobs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  productVariant: one(productVariants, {
    fields: [orderItems.productVariantId],
    references: [productVariants.id],
  }),
}));

export const printJobsRelations = relations(printJobs, ({ one }) => ({
  order: one(orders, { fields: [printJobs.orderId], references: [orders.id] }),
  printer: one(printers, { fields: [printJobs.printerId], references: [printers.id] }),
}));

// ==================== 系统设置 ====================

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settingsRelations = relations(settings, ({ one }) => ({
  store: one(stores, { fields: [settings.storeId], references: [stores.id] }),
}));
