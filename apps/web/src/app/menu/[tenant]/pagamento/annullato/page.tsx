import Link from "next/link";

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

export default async function MenuPaymentCancelledPage({ params, searchParams }: Props) {
  const { tenant } = await params;
  const sp = await searchParams;
  const orderId = firstString(sp.order_id).trim();
  const menuHref = `/menu/${encodeURIComponent(tenant)}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center text-rw-ink">
      <h1 className="font-display text-2xl font-semibold">Pagamento annullato</h1>
      <p className="mt-3 text-sm text-rw-muted">
        Non è stato addebitato nulla. Se era stato creato un ordine provvisorio, risulta ancora{" "}
        <span className="font-semibold text-rw-ink">non pagato</span>
        {orderId ? (
          <>
            {" "}
            (riferimento <span className="font-mono text-xs">{orderId}</span>
            ).
          </>
        ) : (
          "."
        )}{" "}
        Puoi tornare al menu e riprovare, oppure ordinare in sala senza carta.
      </p>
      <Link href={menuHref} className="mt-8 inline-block text-sm font-semibold text-rw-accent underline">
        Torna al menu
      </Link>
    </main>
  );
}
