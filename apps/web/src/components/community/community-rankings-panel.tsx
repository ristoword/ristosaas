"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import { Card } from "@/components/shared/card";
import { communityApi, type CommunityRankings } from "@/lib/api-client";

type Props = {
  onOpenRecipe: (id: string) => void;
  onOpenChef: (id: string) => void;
};

function MiniRecipeList({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { id: string; title: string; chef: { displayName: string } }[];
  onOpen: (id: string) => void;
}) {
  return (
    <Card title={title}>
      <ul className="space-y-2">
        {items.map((r, i) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-rw-surfaceAlt"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-rw-ink">{r.title}</span>
                <span className="text-xs text-rw-muted">{r.chef.displayName}</span>
              </span>
            </button>
          </li>
        ))}
        {!items.length && <li className="py-4 text-center text-xs text-rw-muted">Nessun dato</li>}
      </ul>
    </Card>
  );
}

function MiniChefList({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { id: string; displayName: string; restaurantName: string; followerCount?: number; likeCount?: number }[];
  onOpen: (id: string) => void;
}) {
  return (
    <Card title={title}>
      <ul className="space-y-2">
        {items.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-rw-surfaceAlt"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-rw-ink">{c.displayName}</span>
                <span className="text-xs text-rw-muted">
                  {c.restaurantName}
                  {c.followerCount !== undefined ? ` · ${c.followerCount} follower` : ""}
                  {c.likeCount !== undefined ? ` · ${c.likeCount} like` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!items.length && <li className="py-4 text-center text-xs text-rw-muted">Nessun dato</li>}
      </ul>
    </Card>
  );
}

export function CommunityRankingsPanel({ onOpenRecipe, onOpenChef }: Props) {
  const [data, setData] = useState<CommunityRankings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void communityApi.getRankings().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.chefOfTheMonth && (
        <Card
          title="Chef del mese"
          description="Il professionista con più apprezzamenti nella community."
        >
          <Link
            href={`/risto-community/chef/${data.chefOfTheMonth.id}`}
            className="flex items-center gap-4 rounded-2xl border border-rw-accent/30 bg-gradient-to-r from-rw-accent/10 to-transparent p-4 transition hover:border-rw-accent/60"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-accent/20 text-2xl">
              <Trophy className="h-7 w-7 text-rw-accent" />
            </div>
            <div>
              <p className="text-lg font-semibold text-rw-ink">{data.chefOfTheMonth.displayName}</p>
              <p className="text-sm text-rw-muted">
                {data.chefOfTheMonth.restaurantName} · {data.chefOfTheMonth.city}, {data.chefOfTheMonth.country}
              </p>
            </div>
          </Link>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <MiniChefList title="Chef più seguiti" items={data.topChefsByFollowers} onOpen={onOpenChef} />
        <MiniChefList title="Chef con più like" items={data.topChefsByLikes} onOpen={onOpenChef} />
        <MiniRecipeList title="Ricette più viste" items={data.mostViewedRecipes} onOpen={onOpenRecipe} />
        <MiniRecipeList title="Ricette più commentate" items={data.mostCommentedRecipes} onOpen={onOpenRecipe} />
        <MiniRecipeList title="Ricette più importate" items={data.mostImportedRecipes} onOpen={onOpenRecipe} />
        <MiniRecipeList title="Nuove ricette" items={data.newRecipes} onOpen={onOpenRecipe} />
        <MiniRecipeList title="Ricette in evidenza" items={data.featuredRecipes} onOpen={onOpenRecipe} />
      </div>
    </div>
  );
}
