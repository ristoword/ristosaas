import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PublicTablePayload = {
  tenantName: string;
  roomName: string | null;
  tableName: string;
  seats: number;
};

async function fetchPublicTable(token: string): Promise<PublicTablePayload | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  if (!host) return null;
  const url = `${proto}://${host}/api/public/table?token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicTablePayload;
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchPublicTable(token);
  if (!data) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="rounded-3xl border border-rw-line bg-rw-surface p-8 shadow-rw">
        <p className="text-xs font-semibold uppercase tracking-widest text-rw-muted">{data.tenantName}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-rw-ink">
          {data.roomName ? `${data.roomName} — ` : ""}
          {data.tableName}
        </h1>
        <p className="mt-2 text-rw-soft">Posti: {data.seats}</p>
        <p className="mt-6 text-sm text-rw-muted">
          Pagina di cortesia per il tavolo. L&apos;ordine digitale ospite non è ancora attivo su questa
          struttura; chiedi al personale di sala per assistenza.
        </p>
      </div>
    </main>
  );
}
