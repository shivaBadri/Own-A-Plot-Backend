import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mediaUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { deleteAsset } from "@/lib/cloudinary";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await readJson(request);
  const parsed = mediaUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const media = await prisma.media.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(media);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Deletes from Cloudinary first, then from the database.
 *
 * Order matters. Deleting the row first and then failing the Cloudinary call
 * leaves a paid-for orphan asset with no record of its publicId — unfindable
 * and undeletable. Cloudinary-first means the worst case is a dangling DB row,
 * which is visible in the library and can simply be deleted again.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteAsset(media.publicId, media.kind === "RAW" ? "raw" : "image");
    await prisma.media.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
