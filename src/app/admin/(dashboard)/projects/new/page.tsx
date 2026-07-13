import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "@/components/admin/ProjectForm";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ventures"
        title="New venture"
        description="It stays invisible to the public until you publish it."
      />
      <ProjectForm />
    </>
  );
}
