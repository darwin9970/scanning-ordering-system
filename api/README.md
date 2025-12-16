# API 服务

基于 Elysia + Drizzle ORM + PostgreSQL 的高性能 RESTful API 服务。

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
bun install

# 2. 复制环境变量
cp .env.example .env

# 3. 编辑 .env 文件配置数据库和 Redis
# DATABASE_URL="postgres://postgres:password@localhost:5432/qr_order"
# REDIS_URL="redis://localhost:6379"
# JWT_SECRET="your-secret-key"

# 4. 同步数据库结构
bun run db:push

# 5. 播种测试数据（可选）
bun run db:seed

# 6. 启动开发服务器
bun run dev

# 7. （可选）启动打印 Worker
bun run worker:dev
```

### Docker 部署

```bash
# 从项目根目录执行

# 1. 启动所有服务
docker-compose up -d

# 2. 初始化数据库（自动确认）
docker-compose exec -T api bunx drizzle-kit push --force

# 3. （可选）初始化测试数据
docker-compose exec -T api bun run db:seed

# 4. （可选）初始化页面配置
docker-compose exec -T api bun run init:page-configs
```

## 开发脚本

```bash
# 开发
bun run dev              # 启动开发服务器（热重载）
bun run start            # 生产模式启动
bun run worker           # 启动打印 Worker
bun run worker:dev       # 启动打印 Worker（开发模式）

# 数据库
bun run db:push          # 推送 Schema 到数据库
bun run db:generate      # 生成迁移文件
bun run db:migrate       # 执行迁移
bun run db:studio        # 打开 Drizzle Studio
bun run db:seed          # 播种测试数据

# 代码质量
bun run lint             # ESLint 检查
bun run lint:fix         # ESLint 自动修复
bun run format           # Prettier 格式化
bun run typecheck        # TypeScript 类型检查

# 测试
bun test                 # 运行所有测试
bun test members.spec.ts # 运行特定测试文件
```

## 项目结构

```
api/
├── src/
│   ├── db/              # 数据库相关
│   │   ├── schema.ts    # Drizzle 数据模型
│   │   └── index.ts     # 数据库连接
│   ├── routes/          # API 路由
│   │   ├── auth.ts      # 认证相关
│   │   ├── orders.ts    # 订单管理
│   │   ├── products.ts  # 商品管理
│   │   └── ...
│   ├── lib/             # 工具库
│   │   ├── auth.ts      # JWT 认证
│   │   ├── redis.ts     # Redis 客户端
│   │   └── utils.ts     # 工具函数
│   ├── services/         # 业务服务
│   │   ├── print-service.ts
│   │   └── stock-service.ts
│   ├── worker/          # Worker 服务
│   │   └── print-worker.ts
│   ├── ws/              # WebSocket
│   │   └── index.ts
│   ├── test/            # 测试文件
│   │   ├── helpers.ts   # 测试辅助函数
│   │   ├── members.spec.ts
│   │   ├── coupons.spec.ts
│   │   ├── tables.spec.ts
│   │   └── upload.spec.ts
│   └── index.ts         # 入口文件
├── scripts/              # 脚本文件
│   ├── seed.ts          # 数据播种
│   └── init-page-configs.ts
├── Dockerfile           # Docker 镜像配置
└── package.json
```

## API 文档

启动服务后访问：http://localhost:4000/swagger

## 环境变量

| 变量名       | 必填 | 说明                  | 示例                                        |
| :----------- | :--- | :-------------------- | :------------------------------------------ |
| DATABASE_URL | 是   | PostgreSQL 连接字符串 | postgres://user:pwd@localhost:5432/qr_order |
| REDIS_URL    | 否   | Redis 连接字符串      | redis://localhost:6379                      |
| JWT_SECRET   | 是   | JWT 签名密钥          | your-super-secret-key                       |
| PORT         | 否   | 服务端口              | 4000                                        |
| NODE_ENV     | 否   | 环境模式              | development / production                    |

## 测试

项目使用 Bun 测试框架，支持 TDD 开发：

```bash
# 运行所有测试
bun test

# 运行特定测试文件
bun test src/test/members.spec.ts

# 运行测试并查看覆盖率（如果配置）
bun test --coverage
```

测试覆盖的核心功能：

- ✅ 积分使用（限流、幂等性）
- ✅ 优惠券领取（限流、库存、幂等性）
- ✅ 表格批量创建（限流、幂等性）
- ✅ 上传接口（类型校验、大小限制、限流）

## Docker 部署

### 重新部署（代码更新后）

```bash
# 从项目根目录执行

# 1. 停止旧容器
docker-compose down

# 2. 重新构建 API 和 Worker 镜像
docker-compose build --no-cache api worker

# 3. 启动所有服务
docker-compose up -d

# 4. 检查服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f api
```

### 数据库操作（Docker）

```bash
# 初始化/更新数据库结构（自动确认）
docker-compose exec -T api bunx drizzle-kit push --force

# 初始化测试数据
docker-compose exec -T api bun run db:seed

# 初始化页面配置
docker-compose exec -T api bun run init:page-configs

# 打开 Drizzle Studio
docker-compose exec api bunx drizzle-kit studio
```

## License

MIT
