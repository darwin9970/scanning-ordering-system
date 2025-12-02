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

# 复制依赖和源码
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 暴露端口
EXPOSE 4000

# 启动命令
CMD ["bun", "run", "start"]
