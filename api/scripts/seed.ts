import {
  db,
  admins,
  stores,
  tables,
  categories,
  products,
  productVariants,
  printers,
} from "../src/db";
import { hashPassword, generateQrToken } from "../src/lib/utils";

async function seed() {
  console.log("🌱 开始播种数据...");

  // 创建超级管理员
  const [admin] = await db
    .insert(admins)
    .values({
      username: "admin",
      password: hashPassword("admin123"),
      name: "超级管理员",
      role: "SUPER_ADMIN",
    })
    .onConflictDoNothing()
    .returning();

  console.log("✅ 创建管理员:", admin?.username || "已存在");

  // 创建门店
  const [store] = await db
    .insert(stores)
    .values({
      name: "示例门店",
      address: "北京市朝阳区xxx路xxx号",
      phone: "010-12345678",
    })
    .onConflictDoNothing()
    .returning();

  const storeId = store?.id || 1;
  console.log("✅ 创建门店:", store?.name || "已存在");

  // 创建桌台
  const tableValues = [];
  for (let i = 1; i <= 10; i++) {
    tableValues.push({
      storeId,
      name: `A${i.toString().padStart(2, "0")}`,
      capacity: 4,
      qrCode: generateQrToken(storeId, Date.now() + i),
    });
  }
  await db.insert(tables).values(tableValues).onConflictDoNothing();
  console.log("✅ 创建桌台: 10个");

  // 创建分类
  const categoryData = [
    { name: "热销推荐", sort: 0 },
    { name: "招牌菜", sort: 1 },
    { name: "凉菜", sort: 2 },
    { name: "热菜", sort: 3 },
    { name: "主食", sort: 4 },
    { name: "饮品", sort: 5 },
  ];

  const categoryIds: number[] = [];
  for (const cat of categoryData) {
    const [category] = await db
      .insert(categories)
      .values({ storeId, ...cat })
      .onConflictDoNothing()
      .returning();
    if (category) categoryIds.push(category.id);
  }
  console.log("✅ 创建分类: 6个");

  // 创建商品
  const productData = [
    { categoryIdx: 1, name: "宫保鸡丁", price: 38, desc: "经典川菜，香辣可口" },
    { categoryIdx: 1, name: "红烧肉", price: 48, desc: "肥而不腻，入口即化" },
    { categoryIdx: 2, name: "凉拌黄瓜", price: 12, desc: "清爽开胃" },
    { categoryIdx: 2, name: "皮蛋豆腐", price: 18, desc: "鲜嫩爽滑" },
    { categoryIdx: 3, name: "麻婆豆腐", price: 28, desc: "麻辣鲜香" },
    { categoryIdx: 3, name: "回锅肉", price: 38, desc: "肥瘦相间" },
    { categoryIdx: 4, name: "米饭", price: 3, desc: "东北大米" },
    { categoryIdx: 4, name: "炒饭", price: 18, desc: "蛋炒饭" },
    { categoryIdx: 5, name: "可乐", price: 5, desc: "冰镇可口可乐" },
    { categoryIdx: 5, name: "柠檬茶", price: 12, desc: "自制柠檬红茶" },
  ];

  for (const prod of productData) {
    const categoryId = categoryIds[prod.categoryIdx] ?? categoryIds[0]!;
    const [product] = await db
      .insert(products)
      .values({
        storeId,
        categoryId,
        name: prod.name,
        description: prod.desc,
        basePrice: prod.price.toString(),
        type: "SINGLE" as const,
      })
      .onConflictDoNothing()
      .returning();

    if (product) {
      await db.insert(productVariants).values({
        productId: product.id,
        specs: {},
        price: prod.price.toString(),
        stock: -1,
      });
    }
  }
  console.log("✅ 创建商品: 10个");

  // 创建打印机
  await db
    .insert(printers)
    .values([
      { storeId, sn: "PRINTER001", key: "key001", name: "后厨打印机", type: "KITCHEN" },
      { storeId, sn: "PRINTER002", key: "key002", name: "收银打印机", type: "CASHIER" },
    ])
    .onConflictDoNothing();
  console.log("✅ 创建打印机: 2台");

  console.log("\n🎉 数据播种完成！");
  console.log("📝 登录账号: admin / admin123");

  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ 播种失败:", e);
  process.exit(1);
});
