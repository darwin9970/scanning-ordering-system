# 使用 Bun 官方镜像
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 安装依赖阶段
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 构建阶段
FROM base AS builder

# 构建参数 - 客户端环境变量
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建 Next.js 应用（standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# 运行阶段
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安装健康检查工具
RUN apk add --no-cache wget

# 创建非 root 用户
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# 复制构建产物（standalone 模式）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=bunjs:bunjs /app/.next/standalone ./
COPY --from=builder --chown=bunjs:bunjs /app/.next/static ./.next/static

USER bunjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用 Bun 运行 Next.js standalone server（Bun 可以运行 Node.js 代码）
CMD ["bun", "server.js"]
