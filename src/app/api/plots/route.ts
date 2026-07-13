import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { plotSchema, listQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  validationError,
  paginate,
  readJson,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, perPage } = parsed.data;
  const projectId = request.nextUrl.searchParams.get("projectId");
  const status = request.nextUrl.searchParams.get("status");

  const where: Prisma.PlotWhereInput = {
    // Anonymous callers never see plots belonging to unpublished projects.
    ...(session ? {} : { project: { isPublished: true } }),
  };

  if (projectId) where.projectId = projectId;
  if (status === "AVAILABLE" || status === "RESERVED" || status === "SOLD") {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { plotNumber: { contains: q, mode: "insensitive" } },
      { facing: { contains: q, mode: "insensitive" } },
      { project: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.plot.findMany({
        where,
        include: { project: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.plot.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await readJson(request);
  const parsed = plotSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const plot = await prisma.plot.create({ data: parsed.data });
    return NextResponse.json(plot, { status: 201 });
  } catch (error) {
    // P2002 here means a duplicate plotNumber inside the same project — the
    // composite unique. handleApiError turns that into a readable 409.
    return handleApiError(error);
  }
}
