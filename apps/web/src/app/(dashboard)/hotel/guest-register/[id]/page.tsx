import { GuestRegisterEntryPage } from "@/components/hotel/guest-register/guest-register-entry-page";

type Props = { params: Promise<{ id: string }> };

export default async function GuestRegisterEntryRoute({ params }: Props) {
  const { id } = await params;
  return <GuestRegisterEntryPage entryId={id} />;
}
