# 扫码点餐小程序

基于 uni-app (Vue3) 的餐厅扫码点餐小程序。

## 技术栈

- **框架**: uni-app (Vue3 + script setup)
- **状态管理**: Pinia
- **UI 组件**: uni-ui + 自定义组件
- **样式**: SCSS + rpx 单位

## 项目结构

```
mini/
├── api/                    # API 请求模块
│   ├── config.js           # API 配置
│   ├── request.js          # 请求封装
│   └── index.js            # API 接口集合
├── components/             # 自定义组件
│   ├── q-button/           # 按钮组件
│   ├── q-price/            # 价格组件
│   ├── q-stepper/          # 步进器组件
│   ├── q-tag/              # 标签组件
│   ├── q-empty/            # 空状态组件
│   └── q-skeleton/         # 骨架屏组件
├── pages/                  # 页面
│   ├── index/              # 首页 (扫码入口)
│   ├── menu/               # 菜单点餐页
│   ├── cart/               # 购物车页
│   └── order/              # 订单相关页面
├── store/                  # Pinia 状态管理
│   ├── index.js            # Store 入口
│   ├── table.js            # 桌台信息
│   ├── cart.js             # 购物车
│   └── order.js            # 订单
├── styles/                 # 样式文件
│   ├── variables.scss      # 变量定义
│   ├── mixins.scss         # Mixin 工具
│   └── index.scss          # 全局样式
├── static/                 # 静态资源
├── App.vue                 # 应用入口
├── main.js                 # 主入口
├── pages.json              # 页面配置
├── manifest.json           # 应用配置
└── package.json            # 依赖配置
```

## 运行方式

### 方式一：使用 HBuilderX (推荐新手)

1. **下载安装 HBuilderX**
   - 访问 https://www.dcloud.io/hbuilderx.html
   - 下载并安装 HBuilderX (App开发版)

2. **打开项目**
   - 打开 HBuilderX
   - 菜单: 文件 → 打开目录 → 选择 `mini` 文件夹

3. **运行到浏览器 (H5)**
   - 菜单: 运行 → 运行到浏览器 → Chrome
   - 等待编译完成，会自动打开浏览器

4. **运行到微信小程序**
   - 首先安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - 菜单: 运行 → 运行到小程序模拟器 → 微信开发者工具
   - 等待编译完成，会自动打开微信开发者工具

### 方式二：使用命令行 (需要 Node.js)

1. **安装依赖**

   ```bash
   cd mini
   npm install
   ```

2. **运行 H5 版本**

   ```bash
   npm run dev:h5
   ```

   打开浏览器访问 http://localhost:5173

3. **编译微信小程序**
   ```bash
   npm run dev:mp-weixin
   ```
   编译输出到 `dist/dev/mp-weixin` 目录，用微信开发者工具打开该目录

## 配置说明

### API 地址配置

修改 `api/config.js`:

```javascript
// 开发环境
const DEV_BASE_URL = 'http://localhost:4000'

// 生产环境
const PROD_BASE_URL = 'https://your-api-domain.com'
```

### 微信小程序 AppID

修改 `manifest.json`:

```json
{
  "mp-weixin": {
    "appid": "你的小程序AppID"
  }
}
```

## 页面说明

| 页面     | 路径                 | 说明                       |
| :------- | :------------------- | :------------------------- |
| 首页     | /pages/index/index   | 扫码入口，引导用户扫码点餐 |
| 菜单     | /pages/menu/menu     | 分类浏览商品，加购物车     |
| 购物车   | /pages/cart/cart     | 查看已选商品，修改数量     |
| 确认订单 | /pages/order/confirm | 填写备注，提交订单         |
| 订单详情 | /pages/order/detail  | 查看订单状态               |
| 订单列表 | /pages/order/list    | 历史订单列表               |

## 注意事项

1. 首次运行需要启动后端 API 服务 (`cd api && bun run dev`)
2. 静态图片为占位符，需替换为实际图片
3. 微信小程序需要在 manifest.json 中配置 AppID
4. 生产环境需要配置 HTTPS API 地址
