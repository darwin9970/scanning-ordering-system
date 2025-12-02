# 桌台扫码点单系统 - API 接口文档

## 一、接口概述

- **Base URL**: `http://localhost:4000`
- **数据格式**: JSON
- **认证方式**: Bearer Token (JWT)
- **Swagger 文档**: http://localhost:4000/swagger

## 二、通用响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": -1,
  "message": "错误信息",
  "data": null
}
```

## 三、认证接口 (Auth)

### 3.1 管理员登录

**POST** `/api/auth/login`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

响应示例:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "超级管理员",
      "role": "SUPER_ADMIN",
      "store": null
    }
  }
}
```

### 3.2 获取当前用户信息

**GET** `/api/auth/me`

Headers: `Authorization: Bearer <token>`

## 四、门店管理 (Stores)

### 4.1 获取门店列表

**GET** `/api/stores`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| page | number | 页码 (默认1) |
| pageSize | number | 每页数量 (默认10) |
| keyword | string | 搜索关键词 |
| status | string | 状态筛选 |

### 4.2 获取门店详情

**GET** `/api/stores/:id`

### 4.3 创建门店

**POST** `/api/stores`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| name | string | 是 | 门店名称 |
| address | string | 否 | 地址 |
| phone | string | 否 | 电话 |
| latitude | number | 否 | 纬度 |
| longitude | number | 否 | 经度 |

### 4.4 更新门店

**PUT** `/api/stores/:id`

### 4.5 删除门店

**DELETE** `/api/stores/:id`

## 五、桌台管理 (Tables)

### 5.1 获取桌台列表

**GET** `/api/tables`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| storeId | number | 门店 ID |
| status | string | 状态筛选 |

### 5.2 创建桌台

**POST** `/api/tables`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| storeId | number | 是 | 门店 ID |
| name | string | 是 | 桌台号 |
| capacity | number | 否 | 容纳人数 |

### 5.3 批量创建桌台

**POST** `/api/tables/batch`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| storeId | number | 是 | 门店 ID |
| prefix | string | 是 | 前缀 (如 A) |
| startNum | number | 是 | 起始编号 |
| count | number | 是 | 创建数量 |
| capacity | number | 否 | 容纳人数 |

### 5.4 重新生成二维码

**PUT** `/api/tables/:id/qrcode`

## 六、分类管理 (Categories)

### 6.1 获取分类列表

**GET** `/api/categories`

### 6.2 创建分类

**POST** `/api/categories`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| storeId | number | 是 | 门店 ID |
| name | string | 是 | 分类名称 |
| sort | number | 否 | 排序 |
| icon | string | 否 | 图标 URL |

### 6.3 更新分类

**PUT** `/api/categories/:id`

### 6.4 删除分类

**DELETE** `/api/categories/:id`

> 注：分类下有商品时无法删除

## 七、商品管理 (Products)

### 7.1 获取商品列表

**GET** `/api/products`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| storeId | number | 门店 ID |
| categoryId | number | 分类 ID |
| status | string | 状态筛选 |
| keyword | string | 搜索关键词 |

### 7.2 创建商品

**POST** `/api/products`

请求参数:

```json
{
  "storeId": 1,
  "categoryId": 1,
  "name": "珍珠奶茶",
  "description": "香浓奶茶配Q弹珍珠",
  "imageUrl": "https://...",
  "type": "VARIANT",
  "basePrice": 15,
  "variants": [
    { "specs": { "size": "中杯" }, "price": 15, "stock": -1 },
    { "specs": { "size": "大杯" }, "price": 18, "stock": -1 }
  ],
  "attributes": [
    { "name": "甜度", "options": ["全糖", "七分糖", "无糖"] },
    { "name": "加料", "options": ["不加料", "加椰果+2元"] }
  ]
}
```

### 7.3 更新商品状态

**PUT** `/api/products/:id/status`

请求参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| status | string | AVAILABLE/SOLDOUT/HIDDEN |

## 八、订单管理 (Orders)

### 8.1 获取订单列表

**GET** `/api/orders`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| storeId | number | 门店 ID |
| tableId | number | 桌台 ID |
| status | string | 订单状态 |
| orderNo | string | 订单号搜索 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 8.2 创建订单

**POST** `/api/orders`

请求参数:

```json
{
  "storeId": 1,
  "tableId": 1,
  "userId": 1,
  "items": [
    {
      "variantId": 1,
      "quantity": 2,
      "attributes": [
        { "name": "辣度", "value": "微辣" }
      ]
    }
  ],
  "remark": "不要香菜"
}
```

### 8.3 更新订单状态

**PUT** `/api/orders/:id/status`

请求参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| status | string | 新状态 |

### 8.4 订单退款

**POST** `/api/orders/:id/refund`

请求参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| reason | string | 退款原因 |

### 8.5 今日订单统计

**GET** `/api/orders/today/stats`

响应示例:

```json
{
  "orderCount": 50,
  "revenue": 3500.00,
  "pendingOrders": [...]
}
```

## 九、打印机管理 (Printers)

### 9.1 获取打印机列表

**GET** `/api/printers`

### 9.2 添加打印机

**POST** `/api/printers`

请求参数:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| storeId | number | 是 | 门店 ID |
| sn | string | 是 | 打印机 SN 码 |
| key | string | 是 | 打印机密钥 |
| name | string | 是 | 备注名 |
| type | string | 否 | 类型: KITCHEN/CASHIER/BAR |

### 9.3 测试打印

**POST** `/api/printers/:id/test`

### 9.4 绑定分类

**POST** `/api/printers/:id/bind`

请求参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| categoryIds | number[] | 分类 ID 数组 |

## 十、数据看板 (Dashboard)

### 10.1 概览数据

**GET** `/api/dashboard/overview`

响应示例:

```json
{
  "today": {
    "orders": 50,
    "revenue": 3500.00,
    "pendingOrders": 5
  },
  "yesterday": {
    "orders": 45,
    "revenue": 3200.00
  },
  "total": {
    "products": 100,
    "tables": 20
  }
}
```

### 10.2 销售趋势图

**GET** `/api/dashboard/sales-chart`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| days | number | 天数 (默认7) |

### 10.3 热销商品排行

**GET** `/api/dashboard/top-products`

查询参数:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| limit | number | 数量 (默认10) |

### 10.4 最近订单

**GET** `/api/dashboard/recent-orders`

## 十一、错误码说明

| 错误码 | 说明 |
|:---|:---|
| 0 | 成功 |
| -1 | 通用错误 |
| 400 | 请求参数错误 |
| 401 | 未授权 / Token 无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
