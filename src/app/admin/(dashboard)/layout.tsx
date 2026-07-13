import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * Middleware already guards /admin/*, but it only verifies the JWT — it cannot
 * reach the database from the Edge runtime. This layout re-checks that the
 * admin the token names still EXISTS. Without it, a deleted admin's unexpired
 * cookie would keep working for up to seven days.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [admin, newEnquiries] = await Promise.all([
    prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    }),
    prisma.enquiry.count({ where: { status: "NEW" } }),
  ]);

  if (!admin) redirect("/admin/login");

  return (
    <AdminShell admin={admin} newEnquiries={newEnquiries}>
      {children}
    </AdminShell>
  );
}
