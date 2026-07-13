import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { projectUpdateSchema } from "@/lib/validations";
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

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireAdmin();

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { plots: true, media: true },
    });

    if (!project || (!project.isPublished && !session)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await readJson(request);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Deleting a project cascades to its plots (schema-level onDelete: Cascade) and
 * nulls the FK on its enquiries and media (onDelete: SetNull).
 *
 * The Cloudinary assets attached to it are destroyed first, inside the same
 * request. If Cloudinary fails, the DB row is left alone rather than orphaning
 * live images behind a deleted record — the admin can retry.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  try {
    const media = await prisma.media.findMany({
      where: { projectId: id },
      select: { publicId: true, kind: true },
    });

    const results = await Promise.allSettled(
      media.map((item) =>
        deleteAsset(item.publicId, item.kind === "RAW" ? "raw" : "image")
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      ok: true,
      ...(failed > 0
        ? {
            warning: `${failed} media file${failed === 1 ? "" : "s"} could not be removed from Cloudinary and may need manual cleanup.`,
          }
        : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
