-- 添加 SECOND_HALF_PRICE, QUANTITY_DISCOUNT, 和 BUY_ONE_GET_ONE 到 promotion_type 枚举
-- 执行命令: psql -U your_user -d your_database -f add_second_half_price_enum.sql

-- 方法1: 直接添加枚举值（PostgreSQL 9.1+）
ALTER TYPE promotion_type ADD VALUE IF NOT EXISTS 'SECOND_HALF_PRICE';
ALTER TYPE promotion_type ADD VALUE IF NOT EXISTS 'QUANTITY_DISCOUNT';
ALTER TYPE promotion_type ADD VALUE IF NOT EXISTS 'BUY_ONE_GET_ONE';

-- 注意：如果上述命令失败，可能需要使用以下方法：
-- 方法2: 重建枚举类型（需要先删除依赖）
-- 1. 创建新的枚举类型
-- CREATE TYPE promotion_type_new AS ENUM (
--   'FULL_REDUCE',
--   'DISCOUNT',
--   'NEW_USER',
--   'TIME_LIMITED',
--   'SECOND_HALF_PRICE',
--   'QUANTITY_DISCOUNT',
--   'BUY_ONE_GET_ONE'
-- );
--
-- 2. 修改表使用新类型
-- ALTER TABLE promotions
--   ALTER COLUMN type TYPE promotion_type_new
--   USING type::text::promotion_type_new;
--
-- 3. 删除旧类型
-- DROP TYPE promotion_type;
--
-- 4. 重命名新类型
-- ALTER TYPE promotion_type_new RENAME TO promotion_type;

-- 验证枚举值
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'promotion_type'::regtype
ORDER BY enumsortorder;
