import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";

/**
 * Storico wizard di "setup" mai collegato a un backend reale.
 * Ora la rotta pubblica instrada verso il percorso corretto:
 * - utente autenticato  -> /dashboard
 * - utente non autenticato -> /signup (creazione tenant self-service)
 */
export default async function SetupPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  if (session) redirect("/dashboard");
  redirect("/signup");
}
