"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { LoadErrorBanner } from "@/components/shared/load-error-banner";
import { CommunityRecipeCard, COMMUNITY_CATEGORIES } from "@/components/community/community-recipe-card";
import { CommunityRankingsPanel } from "@/components/community/community-rankings-panel";
import { CommunityPublishForm } from "@/components/community/community-publish-form";
import { CommunityChefProfileForm } from "@/components/community/community-chef-profile-form";
import { communityApi, type CommunityRecipeSummary } from "@/lib/api-client";
import { COMMUNITY_PUBLISH_ROLES } from "@/lib/community/constants";

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "rankings", label: "Classifiche" },
  { id: "publish", label: "Pubblica" },
  { id: "profile", label: "Profilo Chef" },
];

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";

export function CommunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("feed");
  const [recipes, setRecipes] = useState<CommunityRecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");

  const canPublish = useMemo(
    () => user && COMMUNITY_PUBLISH_ROLES.includes(user.role as (typeof COMMUNITY_PUBLISH_ROLES)[number]),
    [user],
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { sort };
      if (search.trim()) params.q = search.trim();
      if (category) params.category = category;
      setRecipes(await communityApi.listRecipes(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [search, category, sort]);

  useEffect(() => {
    if (tab === "feed") void loadFeed();
  }, [tab, loadFeed]);

  async function handleLike(id: string) {
    try {
      const result = await communityApi.likeRecipe(id);
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, likedByMe: result.liked, likeCount: r.likeCount + (result.liked ? 1 : -1) }
            : r,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="🍽️ Risto Community"
        subtitle="La community mondiale esclusiva dei professionisti RistoSimply. Condividi, scopri e importa ricette nel tuo ricettario."
      />

      <TabBar tabs={TABS.filter((t) => (t.id === "publish" ? canPublish : true))} active={tab} onChange={setTab} />

      {tab === "feed" && (
        <div className="space-y-4">
          <Card title="Ricerca istantanea" description="Cerca per nome, ingrediente, chef, ristorante, città o paese.">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  className={`${INPUT} pl-9`}
                  placeholder="Cerca ricette, ingredienti, chef..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void loadFeed()}
                />
              </div>
              <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tutte le categorie</option>
                {COMMUNITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select className={INPUT} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Più recenti</option>
                <option value="views">Più viste</option>
                <option value="likes">Più like</option>
                <option value="comments">Più commentate</option>
                <option value="imports">Più importate</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMMUNITY_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    category === c
                      ? "bg-rw-accent text-white"
                      : "border border-rw-line bg-rw-surfaceAlt text-rw-muted hover:border-rw-accent/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {error && <LoadErrorBanner message={error} />}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recipes.map((recipe) => (
                <CommunityRecipeCard key={recipe.id} recipe={recipe} onLike={handleLike} />
              ))}
              {!recipes.length && (
                <p className="col-span-full py-12 text-center text-sm text-rw-muted">
                  Nessuna ricetta trovata. Sii il primo a pubblicare!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "rankings" && <CommunityRankingsPanel onOpenRecipe={(id) => router.push(`/risto-community/recipe/${id}`)} onOpenChef={(id) => router.push(`/risto-community/chef/${id}`)} />}

      {tab === "publish" && canPublish && (
        <CommunityPublishForm onPublished={(id) => router.push(`/risto-community/recipe/${id}`)} />
      )}

      {tab === "profile" && <CommunityChefProfileForm />}
    </div>
  );
}
