import { ProjectWorkspace } from '@/components/ProjectWorkspace';

export default async function ProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;

  return <ProjectWorkspace projectId={params.projectId ?? null} />;
}
