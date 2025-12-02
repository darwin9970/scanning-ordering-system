import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";

import { authRoutes } from "./routes/auth";
import { storeRoutes } from "./routes/stores";
import { tableRoutes } from "./routes/tables";
import { categoryRoutes } from "./routes/categories";
import { productRoutes } from "./routes/products";
import { orderRoutes } from "./routes/orders";
import { printerRoutes } from "./routes/printers";
import { dashboardRoutes } from "./routes/dashboard";
import { staffRoutes } from "./routes/staff";
import { settingsRoutes } from "./routes/settings";
import { cartRoutes } from "./routes/cart";
import { couponRoutes } from "./routes/coupons";
import { promotionRoutes } from "./routes/promotions";
import { memberRoutes } from "./routes/members";
import { comboRoutes } from "./routes/combos";
import { serviceRoutes } from "./routes/service";
import { uploadRoutes } from "./routes/upload";
import { roleRoutes } from "./routes/roles";
import { wsRoutes } from "./ws";

const app = new Elysia()
  .use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "桌台扫码点单系统 API",
          version: "2.0.0",
          description: "支持多人协同点单、后厨自动分单的餐饮系统 API",
        },
        tags: [
          { name: "Auth", description: "认证相关接口" },
          { name: "Stores", description: "门店管理接口" },
          { name: "Tables", description: "桌台管理接口" },
          { name: "Categories", description: "分类管理接口" },
          { name: "Products", description: "商品管理接口" },
          { name: "Orders", description: "订单管理接口" },
          { name: "Printers", description: "打印机管理接口" },
          { name: "Dashboard", description: "数据看板接口" },
          { name: "Staff", description: "员工管理接口" },
          { name: "Settings", description: "系统设置接口" },
          { name: "Cart", description: "购物车接口" },
          { name: "Coupons", description: "优惠券接口" },
          { name: "Promotions", description: "营销活动接口" },
          { name: "Members", description: "会员积分接口" },
          { name: "Combos", description: "套餐管理接口" },
          { name: "Service", description: "服务呼叫接口" },
          { name: "Upload", description: "文件上传接口" },
          { name: "Roles", description: "角色权限配置接口" },
        ],
      },
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
      exp: "7d",
    })
  )
  .get("/", () => ({
    message: "桌台扫码点单系统 API v2.0",
    docs: "/swagger",
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(storeRoutes)
  .use(tableRoutes)
  .use(categoryRoutes)
  .use(productRoutes)
  .use(orderRoutes)
  .use(printerRoutes)
  .use(dashboardRoutes)
  .use(staffRoutes)
  .use(settingsRoutes)
  .use(cartRoutes)
  .use(couponRoutes)
  .use(promotionRoutes)
  .use(memberRoutes)
  .use(comboRoutes)
  .use(serviceRoutes)
  .use(uploadRoutes)
  .use(roleRoutes)
  .use(wsRoutes)
  // 静态文件服务 - 上传的图片
  .get("/uploads/*", async ({ params }) => {
    const fileName = (params as { "*": string })["*"];
    const filePath = `${process.cwd()}/uploads/${fileName}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  })
  .listen(process.env.PORT || 4000);

console.log(`🦊 Elysia server is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
