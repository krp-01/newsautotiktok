import { prisma } from "./prisma";

export async function logAudit(
  action: string,
  options?: {
    entity?: string;
    entityId?: string;
    details?: string;
    userId?: string;
  }
) {
  await prisma.auditLog.create({
    data: {
      action,
      entity: options?.entity,
      entityId: options?.entityId,
      details: options?.details,
      userId: options?.userId,
    },
  });
}
