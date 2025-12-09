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

// 优惠券类型
export const couponTypeEnum = pgEnum("coupon_type", [
  "FIXED", // 满减券（固定金额）
  "PERCENT", // 折扣券（百分比）
  "NO_THRESHOLD", // 无门槛券
]);

// 优惠券状态
export const couponStatusEnum = pgEnum("coupon_status", ["ACTIVE", "INACTIVE", "EXPIRED"]);

// 用户优惠券状态
export const userCouponStatusEnum = pgEnum("user_coupon_status", ["UNUSED", "USED", "EXPIRED"]);

// 活动类型
export const promotionTypeEnum = pgEnum("promotion_type", [
  "FULL_REDUCE", // 满减活动
  "DISCOUNT", // 折扣活动
  "NEW_USER", // 新人专享
  "TIME_LIMITED", // 限时特价
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
  coverImage: varchar("cover_image", { length: 255 }), // 门店封面图
  description: text("description"), // 门店简介
  announcement: text("announcement"), // 店内公告
  status: storeStatusEnum("status").notNull().default("ACTIVE"),

  // 营业设置
  businessHours: json("business_hours").$type<{
    open: string; // 开始时间 "09:00"
    close: string; // 结束时间 "22:00"
    restDays?: number[]; // 休息日 [0, 6] 表示周日和周六休息
  }>(),

  // 订单设置
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"), // 起订金额
  serviceChargeRate: decimal("service_charge_rate", { precision: 5, scale: 4 }).default("0"), // 服务费率
  autoConfirmOrder: boolean("auto_confirm_order").default(false), // 自动确认订单
  autoCompleteMinutes: integer("auto_complete_minutes").default(60), // 自动完成时间(分钟)

  // 便利设置
  wifiName: varchar("wifi_name", { length: 50 }),
  wifiPassword: varchar("wifi_password", { length: 50 }),
  contactName: varchar("contact_name", { length: 50 }), // 联系人姓名
  contactPhone: varchar("contact_phone", { length: 20 }), // 联系人电话

  // 小程序设置
  welcomeText: varchar("welcome_text", { length: 100 }).default("欢迎光临"), // 欢迎语
  orderTip: text("order_tip"), // 点餐提示语

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
    // 新增字段
    couponId: integer("coupon_id"), // 使用的优惠券ID
    couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0"),
    promotionDiscount: decimal("promotion_discount", { precision: 10, scale: 2 }).default("0"),
    pointsUsed: integer("points_used").default(0), // 使用的积分
    pointsDiscount: decimal("points_discount", { precision: 10, scale: 2 }).default("0"),
    dinersCount: integer("diners_count").default(1), // 就餐人数
    tablewareFee: decimal("tableware_fee", { precision: 10, scale: 2 }).default("0"), // 餐具费
    packingFee: decimal("packing_fee", { precision: 10, scale: 2 }).default("0"), // 打包费
    status: orderStatusEnum("status").notNull().default("PENDING"),
    payTime: timestamp("pay_time"),
    remark: varchar("remark", { length: 255 }),
    // 加菜相关
    isAddition: boolean("is_addition").default(false), // 是否为加菜订单
    parentOrderId: integer("parent_order_id"), // 主订单ID（加菜时使用）
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
    // 退款相关
    refundedQuantity: integer("refunded_quantity").default(0), // 已退款数量
    refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"),
    refundReason: varchar("refund_reason", { length: 255 }),
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

// ==================== 优惠券系统 ====================

// 优惠券模板表
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: couponTypeEnum("type").notNull().default("FIXED"),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(), // 优惠金额或折扣比例
    minAmount: decimal("min_amount", { precision: 10, scale: 2 }).notNull().default("0"), // 最低消费金额
    maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // 最大优惠金额（折扣券用）
    totalCount: integer("total_count").notNull().default(-1), // 发放总量，-1为不限
    usedCount: integer("used_count").notNull().default(0), // 已使用数量
    claimedCount: integer("claimed_count").notNull().default(0), // 已领取数量
    perUserLimit: integer("per_user_limit").notNull().default(1), // 每人限领数量
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    description: text("description"),
    status: couponStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("coupons_store_id_idx").on(table.storeId),
    index("coupons_status_idx").on(table.status),
  ]
);

// 用户优惠券表
export const userCoupons = pgTable(
  "user_coupons",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id), // 使用时关联的订单
    status: userCouponStatusEnum("status").notNull().default("UNUSED"),
    claimedAt: timestamp("claimed_at").notNull().defaultNow(),
    usedAt: timestamp("used_at"),
    expireAt: timestamp("expire_at").notNull(), // 过期时间（可能和券模板不同）
  },
  (table) => [
    index("user_coupons_user_id_idx").on(table.userId),
    index("user_coupons_coupon_id_idx").on(table.couponId),
    index("user_coupons_status_idx").on(table.status),
  ]
);

// ==================== 营销活动系统 ====================

// 活动表
export const promotions = pgTable(
  "promotions",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: promotionTypeEnum("type").notNull(),
    // 规则示例：满减 [{"min": 50, "discount": 5}, {"min": 100, "discount": 15}]
    // 折扣 {"discount": 0.8} 表示8折
    rules: json("rules").$type<Record<string, unknown>>().notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    description: text("description"),
    priority: integer("priority").notNull().default(0), // 优先级，数值越大优先级越高
    stackable: boolean("stackable").notNull().default(false), // 是否可叠加
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("promotions_store_id_idx").on(table.storeId),
    index("promotions_status_idx").on(table.status),
  ]
);

// ==================== 优惠券关系定义 ====================

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  store: one(stores, { fields: [coupons.storeId], references: [stores.id] }),
  userCoupons: many(userCoupons),
}));

export const userCouponsRelations = relations(userCoupons, ({ one }) => ({
  user: one(users, { fields: [userCoupons.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [userCoupons.couponId], references: [coupons.id] }),
  order: one(orders, { fields: [userCoupons.orderId], references: [orders.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  store: one(stores, { fields: [promotions.storeId], references: [stores.id] }),
}));

// ==================== 套餐/组合商品 ====================

// 套餐表
export const combos = pgTable(
  "combos",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 255 }),
    originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(), // 原价（单品总价）
    price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 套餐价
    sales: integer("sales").notNull().default(0),
    stock: integer("stock").notNull().default(-1), // -1为不限
    sort: integer("sort").notNull().default(0),
    status: productStatusEnum("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("combos_store_id_idx").on(table.storeId),
    index("combos_status_idx").on(table.status),
  ]
);

// 套餐商品关联表
export const comboItems = pgTable(
  "combo_items",
  {
    id: serial("id").primaryKey(),
    comboId: integer("combo_id")
      .notNull()
      .references(() => combos.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }), // 可选指定规格
    quantity: integer("quantity").notNull().default(1),
    // 是否可选（如套餐中可选择A或B）
    isOptional: boolean("is_optional").notNull().default(false),
    optionGroup: varchar("option_group", { length: 50 }), // 可选组（同组中选一个）
  },
  (table) => [index("combo_items_combo_id_idx").on(table.comboId)]
);

export const combosRelations = relations(combos, ({ one, many }) => ({
  store: one(stores, { fields: [combos.storeId], references: [stores.id] }),
  items: many(comboItems),
}));

export const comboItemsRelations = relations(comboItems, ({ one }) => ({
  combo: one(combos, { fields: [comboItems.comboId], references: [combos.id] }),
  product: one(products, { fields: [comboItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [comboItems.variantId],
    references: [productVariants.id],
  }),
}));

// ==================== 服务呼叫/催单 ====================

export const serviceCallTypeEnum = pgEnum("service_call_type", [
  "CALL_SERVICE", // 呼叫服务员
  "URGE_ORDER", // 催单
  "REQUEST_BILL", // 请求结账
  "OTHER", // 其他
]);

export const serviceCallStatusEnum = pgEnum("service_call_status", [
  "PENDING", // 待处理
  "ACCEPTED", // 已接受
  "COMPLETED", // 已完成
  "CANCELLED", // 已取消
]);

export const serviceCalls = pgTable(
  "service_calls",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    tableId: integer("table_id")
      .notNull()
      .references(() => tables.id),
    orderId: integer("order_id").references(() => orders.id), // 催单时关联的订单
    type: serviceCallTypeEnum("type").notNull(),
    status: serviceCallStatusEnum("status").notNull().default("PENDING"),
    message: varchar("message", { length: 255 }),
    handledBy: integer("handled_by").references(() => admins.id), // 处理人
    handledAt: timestamp("handled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("service_calls_store_id_idx").on(table.storeId),
    index("service_calls_table_id_idx").on(table.tableId),
    index("service_calls_status_idx").on(table.status),
  ]
);

export const serviceCallsRelations = relations(serviceCalls, ({ one }) => ({
  store: one(stores, { fields: [serviceCalls.storeId], references: [stores.id] }),
  table: one(tables, { fields: [serviceCalls.tableId], references: [tables.id] }),
  order: one(orders, { fields: [serviceCalls.orderId], references: [orders.id] }),
  handler: one(admins, { fields: [serviceCalls.handledBy], references: [admins.id] }),
}));

// ==================== 操作日志 ====================

export const operationLogs = pgTable(
  "operation_logs",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id").references(() => stores.id),
    adminId: integer("admin_id").references(() => admins.id),
    action: varchar("action", { length: 50 }).notNull(), // 操作类型
    targetType: varchar("target_type", { length: 50 }), // 目标类型
    targetId: integer("target_id"), // 目标ID
    details: json("details").$type<Record<string, unknown>>(), // 详细信息
    ip: varchar("ip", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("operation_logs_store_id_idx").on(table.storeId),
    index("operation_logs_admin_id_idx").on(table.adminId),
    index("operation_logs_created_at_idx").on(table.createdAt),
  ]
);

export const operationLogsRelations = relations(operationLogs, ({ one }) => ({
  store: one(stores, { fields: [operationLogs.storeId], references: [stores.id] }),
  admin: one(admins, { fields: [operationLogs.adminId], references: [admins.id] }),
}));

// ==================== 角色权限配置 ====================

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    role: roleEnum("role").notNull(), // 角色
    permissions: json("permissions").$type<string[]>().notNull().default([]), // 权限列表
    description: text("description"), // 角色描述
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: integer("updated_by").references(() => admins.id), // 最后更新者
  },
  (table) => [uniqueIndex("role_permissions_role_idx").on(table.role)]
);

// ==================== Banner/轮播图管理 ====================

export const bannerPositionEnum = pgEnum("banner_position", [
  "HOME_TOP",      // 首页顶部轮播
  "MENU_TOP",      // 菜单页顶部
  "CATEGORY",      // 分类页
  "PROMOTION"      // 活动专区
]);

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id), // null 表示全局
  title: varchar("title", { length: 100 }).notNull(), // 标题
  image: text("image").notNull(), // 图片URL
  position: bannerPositionEnum("position").notNull().default("MENU_TOP"), // 展示位置
  linkType: varchar("link_type", { length: 20 }), // 跳转类型: product/category/promotion/url
  linkValue: varchar("link_value", { length: 255 }), // 跳转值
  sort: integer("sort").notNull().default(0), // 排序
  isActive: boolean("is_active").notNull().default(true), // 是否启用
  startTime: timestamp("start_time"), // 开始时间
  endTime: timestamp("end_time"), // 结束时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bannersRelations = relations(banners, ({ one }) => ({
  store: one(stores, { fields: [banners.storeId], references: [stores.id] }),
}));

// ==================== 页面装修配置 ====================

// 组件类型枚举
export const pageComponentTypeEnum = pgEnum("page_component_type", [
  "BANNER",       // 轮播图
  "NAV_GRID",     // 金刚区/宫格导航
  "PRODUCT_LIST", // 商品列表
  "PRODUCT_GRID", // 商品网格
  "NOTICE",       // 公告栏
  "SPACER",       // 分隔符/留白
  "IMAGE",        // 单图
  "COUPON",       // 优惠券入口
  "HOT_PRODUCTS", // 热销商品
  "NEW_PRODUCTS", // 新品推荐
]);

// 页面配置表
export const pageConfigs = pgTable(
  "page_configs",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    pageType: varchar("page_type", { length: 50 }).notNull().default("HOME"), // HOME/MENU 等
    components: json("components").$type<PageComponent[]>().notNull().default([]),
    isPublished: boolean("is_published").notNull().default(false), // 是否已发布
    publishedAt: timestamp("published_at"), // 发布时间
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("page_configs_store_id_idx").on(table.storeId),
    uniqueIndex("page_configs_store_page_idx").on(table.storeId, table.pageType),
  ]
);

// 页面组件类型定义
export interface PageComponent {
  id: string;                    // 组件唯一ID (uuid)
  type: string;                  // 组件类型
  title?: string;                // 组件标题
  visible: boolean;              // 是否显示
  props: Record<string, unknown>; // 组件配置属性
}

export const pageConfigsRelations = relations(pageConfigs, ({ one }) => ({
  store: one(stores, { fields: [pageConfigs.storeId], references: [stores.id] }),
}));
