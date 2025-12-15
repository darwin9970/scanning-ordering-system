import { db, operationLogs } from "../db";

interface LogOperationParams {
  adminId?: number | null;
  action: string;
  targetType: string;
  targetId?: number | string | null;
  storeId?: number | null;
  details?: Record<string, unknown>;
}

export async function logOperation(params: LogOperationParams) {
  const { adminId = null, action, targetType, targetId = null, storeId = null, details } = params;
  try {
    await db.insert(operationLogs).values({
      adminId,
      action,
      targetType,
      targetId: targetId === undefined ? null : Number(targetId),
      storeId,
      details,
    });
  } catch {
    // 审计失败不影响主流程，静默处理
  }
}
