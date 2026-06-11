import { prisma } from "./prisma";
import type { AppSettings } from "@/generated/prisma/client";

export async function getSettings(): Promise<AppSettings> {
  let settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.appSettings.create({ data: { id: "default" } });
  }
  return settings;
}
