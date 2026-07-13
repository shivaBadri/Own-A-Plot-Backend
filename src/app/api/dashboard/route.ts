import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, unauthorized } from "@/lib/api-utils";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const [
      totalProjects,
      publishedProjects,
      totalPlots,
      plotsAvailable,
      plotsReserved,
      plotsSold,
      newEnquiries,
      totalEnquiries,
      totalMedia,
      soldAggregate,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { isPublished: true } }),
      prisma.plot.count(),
      prisma.plot.count({ where: { status: "AVAILABLE" } }),
      prisma.plot.count({ where: { status: "RESERVED" } }),
      prisma.plot.count({ where: { status: "SOLD" } }),
      prisma.enquiry.count({ where: { status: "NEW" } }),
      prisma.enquiry.count(),
      prisma.media.count(),
      prisma.plot.aggregate({
        where: { status: "SOLD", priceOnRequest: false },
        _sum: { price: true },
      }),
    ]);

    const stats: DashboardStats = {
      totalProjects,
      publishedProjects,
      totalPlots,
      plotsAvailable,
      plotsReserved,
      plotsSold,
      newEnquiries,
      totalEnquiries,
      totalMedia,
      soldValue: soldAggregate._sum.price ?? 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
