# 桌台扫码点单系统 - Docker 快速启动脚本 (PowerShell)

Write-Host "🚀 启动桌台扫码点单系统..." -ForegroundColor Green

# 检查 .env 文件
if (-not (Test-Path .env)) {
    Write-Host "⚠️  未找到 .env 文件，正在创建..." -ForegroundColor Yellow
    @"
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=qr_order

# JWT 密钥（生产环境请修改为强密码）
JWT_SECRET=your-super-secret-key-change-in-production

# 客户端访问地址（用于前端 API 调用）
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "✅ 已创建 .env 文件，请根据需要修改配置" -ForegroundColor Green
}

# 启动服务
Write-Host "📦 启动 Docker 服务..." -ForegroundColor Cyan
docker-compose up -d

# 等待服务启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host "📊 服务状态：" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ 服务已启动！" -ForegroundColor Green
Write-Host ""
Write-Host "📍 访问地址：" -ForegroundColor Cyan
Write-Host "  - 后台管理系统: http://localhost:3000"
Write-Host "  - API 服务: http://localhost:4000"
Write-Host "  - API 文档: http://localhost:4000/swagger"
Write-Host ""
Write-Host "📝 下一步：" -ForegroundColor Yellow
Write-Host "  1. 初始化数据库: docker-compose exec api bun run db:push"
Write-Host "  2. 初始化数据（可选）: docker-compose exec api bun run db:seed"
Write-Host "  3. 初始化页面配置（可选）: docker-compose exec api bun run init:page-configs"
Write-Host ""
Write-Host "📖 查看日志: docker-compose logs -f" -ForegroundColor Cyan
Write-Host "🛑 停止服务: docker-compose down" -ForegroundColor Cyan

