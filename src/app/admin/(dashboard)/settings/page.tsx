import { prisma } from "@/lib/db";
import { resolveSettings } from "@/lib/settings";
import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const row = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Contact details, footer copy, social links, and default SEO. These feed the footer and the contact page."
      />
      <SettingsForm settings={resolveSettings(row)} />
    </>
  );
}
