import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  validationError,
  readJson,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await readJson(request);
  const parsed = siteSettingsSchema.partial().safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { socialLinks, ...rest } = parsed.data;

  const data: Prisma.SiteSettingsUncheckedUpdateInput = { ...rest };
  if (socialLinks !== undefined) {
    data.socialLinks = socialLinks as Prisma.InputJsonValue;
  }

  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: {
        id: "singleton",
        siteName: rest.siteName ?? "Own A Plot",
        ...rest,
        ...(socialLinks
          ? { socialLinks: socialLinks as Prisma.InputJsonValue }
          : {}),
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
