import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword, verifyPassword } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";
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
    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(admin);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await readJson(request);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, avatarUrl, currentPassword, newPassword } = parsed.data;

  const data: { name?: string; avatarUrl?: string; passwordHash?: string } = {};
  if (name !== undefined) data.name = name;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  try {
    if (newPassword) {
      const admin = await prisma.admin.findUnique({
        where: { id: session.adminId },
      });
      const valid =
        admin &&
        currentPassword &&
        (await verifyPassword(currentPassword, admin.passwordHash));

      if (!valid) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            fields: { currentPassword: ["Current password is incorrect"] },
          },
          { status: 401 }
        );
      }
      data.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.admin.update({
      where: { id: session.adminId },
      data,
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
