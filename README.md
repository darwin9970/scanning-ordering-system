# 桌台扫码点单系统

一套支持**多人协同点单**、**后厨自动化分单**的完整餐饮应用体系。

> 🚀 **最新更新**: UI/UX 全面优化（骨架屏、空状态、动画、错误处理）、微信登录与会员积分系统、商品搜索功能

## 项目结构

```
├── admin/              # 后台管理系统 (Next.js 16)
│   ├── .husky/         # Git hooks (pre-commit 检查)
│   └── app/dashboard/  # 页面模块
├── api/                # API 服务 (Elysia + Drizzle)
├── mini/               # 小程序端 (uni-app Vue3)
├── docs/               # 项目文档
├── .vscode/            # 编辑器配置（保存时自动修复）
├── .editorconfig       # 跨编辑器格式统一
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
- ✅ **服务呼叫（催单/加水/结账）**
- ✅ **页面装修系统（自由画布/拖拽组件）** 🆕
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

### 小程序端

- ✅ 扫码点餐
- ✅ 商品浏览与搜索（关键词高亮）
- ✅ 购物车管理（滑动删除）
- ✅ 订单确认（积分抵扣、优惠券）
- ✅ 订单列表与详情（状态轮询通知）
- ✅ 微信登录与会员系统
- ✅ 积分系统（获取、抵扣、记录）
- ✅ 个人中心（会员卡片、积分明细）
- ✅ UI/UX 优化（骨架屏、空状态、动画、错误处理）
- 🔲 多人协同购物车（WebSocket 同步）
- 🔲 在线支付（微信支付）
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

| 服务         | 地址                                  |
| :----------- | :------------------------------------ |
| 后台管理系统 | http://localhost:3000                 |
| API 服务     | http://localhost:4000                 |
| API 文档     | http://localhost:4000/swagger         |
| WebSocket    | ws://localhost:4000/ws/store/:storeId |

### 测试账号

- 用户名: `admin`
- 密码: `admin123`

## 技术栈

| 层级     | 技术                                          |
| :------- | :-------------------------------------------- |
| 后台管理 | Next.js 16, TailwindCSS, React Query, Zustand |
| API 服务 | Elysia, Drizzle ORM, Redis                    |
| 数据库   | PostgreSQL 16                                 |
| 消息队列 | Redis Stream                                  |
| 实时通信 | WebSocket                                     |
| 运行时   | Bun                                           |
| 部署     | Docker Compose                                |

## 开发脚本

### API 服务 (`api/`)

```bash
bun run dev          # 开发模式
bun run start        # 生产模式
bun run worker       # 启动打印 Worker
bun run db:push      # 推送 Schema
bun run db:seed      # 播种数据
bun run lint         # ESLint 检查
bun run typecheck    # TypeScript 检查
```

### 后台管理 (`admin/`)

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run lint:fix     # 自动修复
npm run typecheck    # TypeScript 检查
```

## 代码质量工具

项目配置了完整的代码质量工具链：

| 工具            | 作用           |
| :-------------- | :------------- |
| **ESLint**      | 代码规范检查   |
| **Prettier**    | 代码格式化     |
| **Husky**       | Git hooks 管理 |
| **lint-staged** | 只检查暂存文件 |

### 自动检查

```bash
# 提交代码时自动运行
git commit -m "feat: xxx"
# ↓ 触发 pre-commit hook
# ✅ lint-staged (ESLint + Prettier)
# ✅ TypeScript 类型检查
```

### 编辑器配置

项目包含 `.vscode/settings.json`，支持：

- 保存时自动格式化
- 保存时自动修复 ESLint 错误
- 推荐扩展列表

## 文档

| 文档                                                         | 说明                                    |
| :----------------------------------------------------------- | :-------------------------------------- |
| [01-项目结构文档](./docs/01-项目结构文档.md)                 | 目录结构、技术栈、启动指南              |
| [02-数据库设计文档](./docs/02-数据库设计文档.md)             | 数据模型、ER 图                         |
| [03-API 接口文档](./docs/03-API接口文档.md)                  | 接口列表、请求示例                      |
| [04-后台管理系统架构文档](./docs/04-后台管理系统架构文档.md) | 前端架构、组件设计                      |
| [05-开发与部署指南](./docs/05-开发与部署指南.md)             | 开发规范、Docker 部署、故障排查         |
| [06-小程序页面装修渲染指南](./docs/06-小程序页面装修渲染指南.md) | 页面装修系统、预设配置、组件渲染 🆕     |
| [07-项目审查报告](./docs/07-项目审查报告.md)                 | 竞品对比、改进建议、优势分析           |
| [08-UI交互评估与改进建议](./docs/08-UI交互评估与改进建议.md) | UI/UX 评估、改进实施、工具组件 🆕       |
| [09-系统改进总结](./docs/09-系统改进总结.md)                 | 系统改进总结、统计数据、效果分析 🆕     |
| [10-竞品对比分析](./docs/10-竞品对比分析.md)                 | 竞品对比、优势分析、改进方向 🆕         |

## 截图预览

### 数据概览

![Dashboard](./docs/screenshots/dashboard.png)

### 订单管理

![Orders](./docs/screenshots/orders.png)

### 角色权限配置

![Roles](./docs/screenshots/roles.png)

## License

MIT
