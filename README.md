# 桌台扫码点单系统

一套支持**多人协同点单**、**后厨自动化分单**的完整餐饮应用体系。

> 🚀 **最新更新**: 完成 RBAC 权限系统、优惠券/营销/会员模块

## 项目结构

```
├── admin/              # 后台管理系统 (Next.js 16)
├── api/                # API 服务 (Elysia + Drizzle)
├── mini/               # 小程序端 (uni-app Vue3)
├── docs/               # 项目文档
├── nginx/              # Nginx 配置
├── docker-compose.yml  # Docker 编排
└── .env.example        # 环境变量示例
```

## 核心功能

### 商家端 (Web 后台)
- ✅ 数据概览看板（图表统计）
- ✅ 订单管理（查看/状态变更/退款/加菜）
- ✅ 商品管理（SPU/SKU/多规格/属性）
- ✅ 套餐管理（商品组合）
- ✅ 分类管理（拖拽排序）
- ✅ 桌台管理（二维码生成/批量创建）
- ✅ 打印机配置（分单规则/测试打印）
- ✅ 门店管理（多门店支持）
- ✅ 员工管理（CRUD/角色分配）
- ✅ **角色权限（RBAC 动态配置）** 🆕
- ✅ **优惠券管理（满减/折扣/无门槛）** 🆕
- ✅ **营销活动（满减/限时折扣）** 🆕
- ✅ **会员管理（等级/积分规则）** 🆕
- ✅ **服务呼叫（催单/加水/结账）** 🆕
- ✅ 数据报表（销售统计/图表导出）
- ✅ 系统设置
- ✅ 实时订单通知（WebSocket）

### 后端服务
- ✅ RESTful API（全模块覆盖）
- ✅ **RBAC 权限系统（细粒度控制）** 🆕
- ✅ JWT 认证
- ✅ Swagger 文档
- ✅ Drizzle ORM + PostgreSQL
- ✅ Redis 缓存
- ✅ WebSocket 实时通信
- ✅ 打印任务 Worker（Redis Stream）
- ✅ 文件上传服务 🆕

### 小程序端（开发中）
- 🔲 扫码点餐
- 🔲 多人协同购物车
- 🔲 在线支付
- 🔲 订单追踪
- 🔲 服务呼叫

## 快速开始

### 方式一：本地开发

#### 环境要求
- Bun 1.x
- PostgreSQL 16+
- Redis 7.0+

#### 启动 API 服务

```bash
cd api
bun install
cp .env.example .env   # 编辑数据库配置
bun run db:push        # 同步表结构
bun run db:seed        # 播种测试数据
bun run dev            # 启动 API
```

#### 启动打印 Worker (可选)

```bash
cd api
bun run worker:dev
```

#### 启动后台管理系统

```bash
cd admin
bun install
bun run dev
```

### 方式二：Docker 部署

```bash
# 复制环境变量
cp .env.example .env

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 访问地址

| 服务 | 地址 |
|:---|:---|
| 后台管理系统 | http://localhost:3000 |
| API 服务 | http://localhost:4000 |
| API 文档 | http://localhost:4000/swagger |
| WebSocket | ws://localhost:4000/ws/store/:storeId |

### 测试账号

- 用户名: `admin`
- 密码: `admin123`

## 技术栈

| 层级 | 技术 |
|:---|:---|
| 后台管理 | Next.js 16, TailwindCSS, React Query, Zustand |
| API 服务 | Elysia, Drizzle ORM, Redis |
| 数据库 | PostgreSQL 16 |
| 消息队列 | Redis Stream |
| 实时通信 | WebSocket |
| 运行时 | Bun |
| 部署 | Docker Compose |

## API 脚本

```bash
# API 服务
bun run dev          # 开发模式
bun run start        # 生产模式
bun run worker       # 启动打印 Worker

# 数据库
bun run db:push      # 推送 Schema
bun run db:generate  # 生成迁移
bun run db:studio    # Drizzle Studio
bun run db:seed      # 播种数据

# 代码质量
bun run lint         # ESLint 检查
bun run format       # Prettier 格式化
```

## 文档

| 文档 | 说明 |
|:---|:---|
| [01-项目结构文档](./docs/01-项目结构文档.md) | 目录结构、技术栈、启动指南 |
| [02-数据库设计文档](./docs/02-数据库设计文档.md) | 数据模型、ER 图 |
| [03-API接口文档](./docs/03-API接口文档.md) | 接口列表、请求示例 |
| [04-后台管理系统架构文档](./docs/04-后台管理系统架构文档.md) | 前端架构、组件设计 |
| [05-开发与部署指南](./docs/05-开发与部署指南.md) | 开发规范、部署流程 |
| [06-小程序功能规划文档](./docs/06-小程序功能规划文档.md) | 小程序功能规划、UI 设计 🆕 |

## 截图预览

### 数据概览
![Dashboard](./docs/screenshots/dashboard.png)

### 订单管理
![Orders](./docs/screenshots/orders.png)

### 角色权限配置
![Roles](./docs/screenshots/roles.png)

## License

MIT
