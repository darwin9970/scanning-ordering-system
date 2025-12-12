# 使用 Bun 官方镜像
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 安装依赖阶段 (包含 devDependencies 用于数据库迁移)
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 运行阶段
FROM base AS runner
ENV NODE_ENV=production

# 安装健康检查工具
RUN apk add --no-cache wget

# 创建非 root 用户
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# 复制依赖和源码
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=bunjs:bunjs . .

# 创建上传目录
RUN mkdir -p /app/uploads && chown bunjs:bunjs /app/uploads

USER bunjs

# 暴露端口
EXPOSE 4000

# 启动命令
CMD ["bun", "run", "start"]
