import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { plotUpdateSchema } from "@/lib/validations";
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
    const plot = await prisma.plot.findUnique({
      where: { id },
      include: { project: true, media: true },
    });

    if (!plot || (!plot.project.isPublished && !session)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(plot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await readJson(request);
  const parsed = plotUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const plot = await prisma.plot.update({ where: { id }, data: parsed.data });
    return NextResponse.json(plot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  try {
    const media = await prisma.media.findMany({
      where: { plotId: id },
      select: { publicId: true, kind: true },
    });

    await Promise.allSettled(
      media.map((item) =>
        deleteAsset(item.publicId, item.kind === "RAW" ? "raw" : "image")
      )
    );

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { plotId: id } }),
      prisma.plot.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
