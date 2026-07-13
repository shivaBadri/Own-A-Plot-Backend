import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import ProfileForm from "@/components/admin/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!admin) redirect("/admin/login");

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your name, avatar, and password."
      />
      <ProfileForm admin={admin} />
    </>
  );
}
