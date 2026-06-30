"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { LoadErrorBanner } from "@/components/shared/load-error-banner";
import { CommunityRecipeCard } from "@/components/community/community-recipe-card";
import { communityApi, type CommunityChefSummary, type CommunityRecipeSummary } from "@/lib/api-client";

export function CommunityChefPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [chef, setChef] = useState<CommunityChefSummary | null>(null);
  const [recipes, setRecipes] = useState<CommunityRecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void communityApi
      .getChef(id)
      .then((data) => {
        setChef(data.chef);
        setRecipes(data.recipes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleFollow() {
    if (!chef) return;
    const result = await communityApi.followChef(id);
    setChef({ ...chef, isFollowing: result.following, followerCount: chef.followerCount + (result.following ? 1 : -1) });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  if (error || !chef) {
    return <LoadErrorBanner message={error ?? "Chef non trovato"} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <button type="button" onClick={() => router.push("/risto-community")} className="inline-flex items-center gap-2 text-sm text-rw-muted hover:text-rw-accent">
        <ArrowLeft className="h-4 w-4" /> Torna alla Community
      </button>

      <div className="overflow-hidden rounded-2xl border border-rw-line bg-gradient-to-br from-rw-surface to-rw-surfaceAlt p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rw-accent/15 text-3xl">
            {chef.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chef.photoUrl} alt={chef.displayName} className="h-full w-full object-cover" />
            ) : (
              "👨‍🍳"
            )}
          </div>
          <div className="flex-1">
            <PageHeader title={chef.displayName} subtitle={chef.signature || "Chef professionista RistoSimply"} />
            <p className="mt-2 flex items-center gap-2 text-sm text-rw-muted">
              <MapPin className="h-4 w-4" />
              {chef.restaurantName} · {chef.city}, {chef.country}
            </p>
            {chef.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-rw-ink/80">{chef.bio}</p>}
          </div>
          <button
            type="button"
            onClick={() => void handleFollow()}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              chef.isFollowing
                ? "border border-rw-line bg-rw-surfaceAlt text-rw-ink"
                : "bg-rw-accent text-white hover:bg-rw-accent/90"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            {chef.isFollowing ? "Seguito" : "Segui"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Ricette", value: chef.recipeCount },
            { label: "Follower", value: chef.followerCount },
            { label: "Like ricevuti", value: chef.likeCount },
            { label: "Importazioni", value: chef.importCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-rw-line/60 bg-rw-bg/50 p-3 text-center">
              <p className="text-xl font-bold text-rw-ink">{stat.value}</p>
              <p className="text-xs text-rw-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Card title={`Ricette di ${chef.displayName}`} description={`${recipes.length} ricette pubblicate nella community.`}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <CommunityRecipeCard key={recipe.id} recipe={recipe} />
          ))}
          {!recipes.length && <p className="col-span-full py-8 text-center text-sm text-rw-muted">Nessuna ricetta pubblicata ancora.</p>}
        </div>
      </Card>
    </div>
  );
}
