import Link from "next/link";
import { notFound } from "next/navigation";
import { stripeGet } from "@/lib/billing/stripe-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

export default async function MenuPaymentOkPage({ params, searchParams }: Props) {
  const { tenant } = await params;
  const sp = await searchParams;
  const sessionId = firstString(sp.session_id).trim();
  const menuHref = `/menu/${encodeURIComponent(tenant)}`;

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-rw-ink">
        <h1 className="font-display text-2xl font-semibold">Pagamento</h1>
        <p className="mt-3 text-sm text-rw-muted">Sessione di pagamento non indicata.</p>
        <Link href={menuHref} className="mt-8 inline-block text-sm font-semibold text-rw-accent underline">
          Torna al menu
        </Link>
      </main>
    );
  }

  const res = await stripeGet<{
    payment_status?: string;
    metadata?: Record<string, string>;
  }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);

  if (!res.ok) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-rw-ink">
        <h1 className="font-display text-2xl font-semibold">Pagamento</h1>
        <p className="mt-3 text-sm text-rw-muted">Non è stato possibile verificare il pagamento con Stripe.</p>
        <Link href={menuHref} className="mt-8 inline-block text-sm font-semibold text-rw-accent underline">
          Torna al menu
        </Link>
      </main>
    );
  }

  const md = res.data.metadata ?? {};
  if (md.purpose !== "restaurant_order" || md.tenantSlug !== tenant) {
    notFound();
  }

  const paid = res.data.payment_status === "paid";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center text-rw-ink">
      <h1 className="font-display text-2xl font-semibold">{paid ? "Pagamento ricevuto" : "Pagamento in elaborazione"}</h1>
      <p className="mt-3 text-sm text-rw-muted">
        {paid
          ? "L’ordine risulta pagato online. Lo staff lo gestirà a breve."
          : "Se hai completato il pagamento, l’aggiornamento può richiedere qualche secondo. In caso di dubbi chiedi in cassa."}
      </p>
      <Link href={menuHref} className="mt-8 inline-block text-sm font-semibold text-rw-accent underline">
        Torna al menu
      </Link>
    </main>
  );
}
