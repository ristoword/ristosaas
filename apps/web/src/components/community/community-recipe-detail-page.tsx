"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Download,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  User,
} from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { LoadErrorBanner } from "@/components/shared/load-error-banner";
import { communityApi, type CommunityComment, type CommunityRecipeDetail } from "@/lib/api-client";
import { COMMUNITY_TRANSLATION_LOCALES } from "@/lib/community/constants";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rw-accent/20 transition hover:bg-rw-accent/90 disabled:opacity-50";
const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink focus:border-rw-accent focus:outline-none";

function CommentThread({
  comments,
  onReply,
}: {
  comments: CommunityComment[];
  onReply: (parentId: string, body: string) => void;
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="rounded-xl border border-rw-line bg-rw-bg p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-rw-ink">{c.userName}</span>
            <span className="text-xs text-rw-muted">{new Date(c.createdAt).toLocaleString("it-IT")}</span>
          </div>
          <p className="mt-2 text-sm text-rw-ink/90">{c.body}</p>
          <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="mt-2 text-xs text-rw-accent hover:underline">
            Rispondi
          </button>
          {replyTo === c.id && (
            <div className="mt-2 flex gap-2">
              <input className={INPUT} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="La tua risposta..." />
              <button
                type="button"
                onClick={() => {
                  if (replyText.trim()) {
                    onReply(c.id, replyText.trim());
                    setReplyText("");
                    setReplyTo(null);
                  }
                }}
                className="rounded-xl bg-rw-accent px-3 text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
          {c.replies.length > 0 && (
            <div className="ml-4 mt-3 border-l-2 border-rw-line pl-3">
              <CommentThread comments={c.replies} onReply={onReply} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CommunityRecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useI18n();
  const id = String(params.id);
  const [recipe, setRecipe] = useState<CommunityRecipeDetail | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<string | null>(null);
  const [translateLocale, setTranslateLocale] = useState<string>(locale);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        communityApi.getRecipe(id, translateLocale !== "it" ? translateLocale : undefined),
        communityApi.listComments(id),
      ]);
      setRecipe(r);
      setComments(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [id, translateLocale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLike() {
    if (!recipe) return;
    const result = await communityApi.likeRecipe(id);
    setRecipe({
      ...recipe,
      likedByMe: result.liked,
      likeCount: recipe.likeCount + (result.liked ? 1 : -1),
    });
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await communityApi.importRecipe(id);
      setImportDone(result.localRecipeName);
      setRecipe((r) => (r ? { ...r, importCount: r.importCount + 1 } : r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fallito");
    } finally {
      setImporting(false);
    }
  }

  async function handleComment(body: string, parentId?: string) {
    await communityApi.addComment(id, body, parentId);
    setComments(await communityApi.listComments(id));
    setRecipe((r) => (r ? { ...r, commentCount: r.commentCount + 1 } : r));
  }

  async function handleTranslate() {
    await communityApi.translateRecipe(id, translateLocale);
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  if (error || !recipe) {
    return <LoadErrorBanner message={error ?? "Ricetta non trovata"} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <button type="button" onClick={() => router.push("/risto-community")} className="inline-flex items-center gap-2 text-sm text-rw-muted hover:text-rw-accent">
        <ArrowLeft className="h-4 w-4" /> Torna al feed
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-rw-line bg-rw-surface">
            {recipe.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.photoUrl} alt={recipe.title} className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-rw-surfaceAlt text-6xl opacity-30">🍽️</div>
            )}
          </div>

          <PageHeader title={recipe.title} subtitle={`${recipe.category} · ${recipe.portions} porzioni`} />

          <div className="flex flex-wrap gap-3 text-sm text-rw-muted">
            <Link href={`/risto-community/chef/${recipe.chef.id}`} className="inline-flex items-center gap-1 hover:text-rw-accent">
              <User className="h-4 w-4" />
              {recipe.chef.displayName}
              {recipe.chef.signature ? ` · ${recipe.chef.signature}` : ""}
            </Link>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {recipe.chef.restaurantName}, {recipe.chef.city}, {recipe.chef.country}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Prep {recipe.prepTimeMin} min · Cottura {recipe.cookTimeMin} min
            </span>
          </div>

          {recipe.description && (
            <Card title="Descrizione">
              <p className="text-sm leading-relaxed text-rw-ink/90">{recipe.description}</p>
            </Card>
          )}

          <Card title="Ingredienti">
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id ?? ing.name} className="flex justify-between text-sm">
                  <span>{ing.name}</span>
                  <span className="font-mono text-rw-muted">{ing.qty} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Procedimento">
            <ol className="space-y-3">
              {recipe.steps.map((step) => (
                <li key={step.id ?? step.order} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                    {step.order}
                  </span>
                  <span className="text-rw-ink/90">{step.text}</span>
                </li>
              ))}
            </ol>
          </Card>

          {(recipe.chefTips || recipe.techniques || recipe.plating || recipe.variants) && (
            <Card title="Dettagli professionali">
              <div className="space-y-3 text-sm text-rw-ink/90">
                {recipe.chefTips && <p><strong>Consigli dello Chef:</strong> {recipe.chefTips}</p>}
                {recipe.techniques && <p><strong>Tecniche:</strong> {recipe.techniques}</p>}
                {recipe.plating && <p><strong>Impiattamento:</strong> {recipe.plating}</p>}
                {recipe.variants && <p><strong>Varianti:</strong> {recipe.variants}</p>}
                {recipe.temperatures && <p><strong>Temperature:</strong> {recipe.temperatures}</p>}
                {recipe.allergens && <p><strong>Allergeni:</strong> {recipe.allergens}</p>}
                {recipe.theoreticalCost != null && <p><strong>Costo teorico:</strong> € {recipe.theoreticalCost.toFixed(2)}</p>}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <button type="button" onClick={() => void handleImport()} disabled={importing} className={`${BTN_PRIMARY} w-full`}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-5 w-5" />}
              📥 IMPORTA NEL MIO RICETTARIO
            </button>
            {importDone && (
              <p className="mt-3 text-center text-sm text-emerald-400">
                Copiata come &quot;{importDone}&quot; nel tuo ricettario privato (modificabile liberamente).
              </p>
            )}
            <p className="mt-3 text-xs text-rw-muted">
              La copia include attribuzione all&apos;autore originale e il link alla ricetta Community.
            </p>
          </Card>

          <Card title="Interazioni">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleLike()} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${recipe.likedByMe ? "border-rose-400/50 bg-rose-400/10 text-rose-400" : "border-rw-line hover:border-rose-400/50"}`}>
                <Heart className={`h-4 w-4 ${recipe.likedByMe ? "fill-current" : ""}`} />
                {recipe.likeCount} Like
              </button>
              <span className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm text-rw-muted">
                <MessageCircle className="h-4 w-4" />
                {recipe.commentCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm text-rw-muted">
                <Download className="h-4 w-4" />
                {recipe.importCount} import
              </span>
            </div>
          </Card>

          <Card title="Traduzione automatica">
            <div className="flex gap-2">
              <select className={INPUT} value={translateLocale} onChange={(e) => setTranslateLocale(e.target.value)}>
                {COMMUNITY_TRANSLATION_LOCALES.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
              <button type="button" onClick={() => void handleTranslate()} className="shrink-0 rounded-xl bg-rw-surfaceAlt px-4 text-sm font-medium text-rw-ink hover:bg-rw-line">
                Traduci
              </button>
            </div>
          </Card>

          <Card title="Commenti e domande">
            <div className="mb-4 flex gap-2">
              <input className={INPUT} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Scrivi un commento o una domanda..." />
              <button
                type="button"
                onClick={() => {
                  if (commentText.trim()) {
                    void handleComment(commentText.trim());
                    setCommentText("");
                  }
                }}
                className="rounded-xl bg-rw-accent px-3 text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <CommentThread comments={comments} onReply={(parentId, body) => void handleComment(body, parentId)} />
          </Card>
        </div>
      </div>
    </div>
  );
}
