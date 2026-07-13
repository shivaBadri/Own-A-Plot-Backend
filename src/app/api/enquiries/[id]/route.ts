import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { enquiryUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  validationError,
  readJson,
} from "@/lib/api-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await readJson(request);
  const parsed = enquiryUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(enquiry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  try {
    await prisma.enquiry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
