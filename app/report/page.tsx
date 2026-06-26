import { ReportWorkspace } from '@/components/ReportWorkspace';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;

  return <ReportWorkspace projectId={params.projectId ?? null} />;
}
