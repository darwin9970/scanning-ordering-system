# 桌台扫码点单系统

一套支持**多人协同点单**、**后厨自动化分单**的完整餐饮应用体系。

## 项目结构

```
├── admin/              # 后台管理系统 (Next.js 16)
├── api/                # API 服务 (Elysia + Drizzle)
├── docs/               # 项目文档
├── nginx/              # Nginx 配置
├── docker-compose.yml  # Docker 编排
└── .env.example        # 环境变量示例
```

## 核心功能

### 商家端 (Web 后台)
- ✅ 数据概览看板
- ✅ 订单管理 (查看/状态变更/退款)
- ✅ 商品管理 (SPU/SKU/属性)
- ✅ 分类管理
- ✅ 桌台管理 (单个/批量创建)
- ✅ 打印机配置 (分单规则)
- ✅ 门店管理
- ✅ 数据报表
- ✅ **实时订单通知 (WebSocket)**

### 后端服务
- ✅ RESTful API
- ✅ JWT 认证
- ✅ Swagger 文档
- ✅ **Drizzle ORM + PostgreSQL**
- ✅ Redis 缓存
- ✅ **WebSocket 实时通信**
- ✅ **打印任务 Worker (Redis Stream)**

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

详细文档请查看 `/docs` 目录。

## License

MIT
