"use client";

import Link from "next/link";
import {
  Clock,
  Download,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  User,
} from "lucide-react";
import type { CommunityRecipeSummary } from "@/lib/api-client";
import { COMMUNITY_CATEGORIES } from "@/lib/community/constants";

const DIFF_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Media",
  hard: "Difficile",
  expert: "Expert",
};

type Props = {
  recipe: CommunityRecipeSummary;
  onLike?: (id: string) => void;
};

export function CommunityRecipeCard({ recipe, onLike }: Props) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-rw-line bg-rw-surface transition hover:border-rw-accent/40 hover:shadow-lg hover:shadow-rw-accent/5">
      <Link href={`/risto-community/recipe/${recipe.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-rw-surfaceAlt">
          {recipe.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.photoUrl}
              alt={recipe.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl opacity-30">🍽️</div>
          )}
          {recipe.featured && (
            <span className="absolute left-3 top-3 rounded-full bg-rw-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              In evidenza
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/risto-community/recipe/${recipe.id}`}>
              <h3 className="text-base font-semibold text-rw-ink transition hover:text-rw-accent">
                {recipe.title}
              </h3>
            </Link>
            <p className="mt-1 text-xs text-rw-muted">
              <Link href={`/risto-community/chef/${recipe.chef.id}`} className="hover:text-rw-accent">
                {recipe.chef.displayName}
              </Link>
              {recipe.chef.signature ? ` · ${recipe.chef.signature}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-rw-surfaceAlt px-2 py-1 text-[10px] font-semibold text-rw-muted">
            {recipe.category}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rw-muted">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {recipe.chef.restaurantName}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {recipe.chef.city}, {recipe.chef.country}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.prepTimeMin + recipe.cookTimeMin} min
          </span>
          <span>{DIFF_LABELS[recipe.difficulty] ?? recipe.difficulty}</span>
        </div>

        <div className="flex items-center justify-between border-t border-rw-line/60 pt-3 text-xs text-rw-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {recipe.viewCount}
            </span>
            <button
              type="button"
              onClick={() => onLike?.(recipe.id)}
              className={`inline-flex items-center gap-1 transition ${recipe.likedByMe ? "text-rose-400" : "hover:text-rose-400"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${recipe.likedByMe ? "fill-current" : ""}`} />
              {recipe.likeCount}
            </button>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {recipe.commentCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {recipe.importCount}
            </span>
          </div>
          <span>{new Date(recipe.publishedAt).toLocaleDateString("it-IT")}</span>
        </div>
      </div>
    </article>
  );
}

export { COMMUNITY_CATEGORIES };
