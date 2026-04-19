import { MaintenancePage } from "@/components/maintenance/maintenance-page";

type Props = { searchParams: Promise<{ reason?: string }> };

export default async function Page(props: Props) {
  const sp = await props.searchParams;
  const reason = sp.reason === "tenant" ? "tenant" : "maintenance";
  return <MaintenancePage reason={reason} />;
}
