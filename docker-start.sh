#!/bin/bash

# 桌台扫码点单系统 - Docker 快速启动脚本

set -e

echo "🚀 启动桌台扫码点单系统..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在创建..."
    cat > .env << EOF
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=qr_order

# JWT 密钥（生产环境请修改为强密码）
JWT_SECRET=your-super-secret-key-change-in-production

# 客户端访问地址（用于前端 API 调用）
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
EOF
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 启动服务
echo "📦 启动 Docker 服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 服务状态："
docker-compose ps

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📍 访问地址："
echo "  - 后台管理系统: http://localhost:3000"
echo "  - API 服务: http://localhost:4000"
echo "  - API 文档: http://localhost:4000/swagger"
echo ""
echo "📝 下一步："
echo "  1. 初始化数据库: docker-compose exec api bun run db:push"
echo "  2. 初始化数据（可选）: docker-compose exec api bun run db:seed"
echo "  3. 初始化页面配置（可选）: docker-compose exec api bun run init:page-configs"
echo ""
echo "📖 查看日志: docker-compose logs -f"
echo "🛑 停止服务: docker-compose down"

