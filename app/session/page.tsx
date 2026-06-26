import { SessionWorkspace } from '@/components/SessionWorkspace';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;

  return <SessionWorkspace projectId={params.projectId ?? null} />;
}
