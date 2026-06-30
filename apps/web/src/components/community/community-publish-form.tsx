"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Card } from "@/components/shared/card";
import { communityApi, type CommunityRecipeInput } from "@/lib/api-client";
import { COMMUNITY_CATEGORIES, COMMUNITY_DIFFICULTIES } from "@/lib/community/constants";

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-50";

type Props = { onPublished: (id: string) => void };

export function CommunityPublishForm({ onPublished }: Props) {
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityRecipeInput>({
    title: "",
    category: "Primi",
    description: "",
    photoUrl: null,
    prepTimeMin: 30,
    cookTimeMin: 15,
    difficulty: "medium",
    portions: 4,
    allergens: "",
    chefTips: "",
    techniques: "",
    plating: "",
    variants: "",
    temperatures: "",
    theoreticalCost: null,
    ingredients: [{ name: "", qty: 0, unit: "g" }],
    steps: [{ order: 1, text: "" }],
  });

  function updateIng(idx: number, field: "name" | "qty" | "unit", value: string | number) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)),
    }));
  }

  function updateStep(idx: number, text: string) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, text } : s)),
    }));
  }

  async function handleAiImprove() {
    setAiLoading(true);
    try {
      const improved = await communityApi.aiImprove(form);
      setForm((f) => ({
        ...f,
        description: improved.description ?? f.description,
        chefTips: improved.chefTips ?? f.chefTips,
        techniques: improved.techniques ?? f.techniques,
        plating: improved.plating ?? f.plating,
        variants: improved.variants ?? f.variants,
        ingredients: improved.suggestedIngredients?.length ? improved.suggestedIngredients : f.ingredients,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI non disponibile");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const recipe = await communityApi.publishRecipe({
        ...form,
        ingredients: form.ingredients.filter((i) => i.name.trim()),
        steps: form.steps.filter((s) => s.text.trim()).map((s, i) => ({ ...s, order: i + 1 })),
      });
      onPublished(recipe.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore pubblicazione");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <Card
        title="Pubblica una ricetta professionale"
        description="Owner, Chef (cucina) e Executive Chef (supervisor) possono pubblicare nella community mondiale."
      >
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => void handleAiImprove()} disabled={aiLoading} className={BTN_PRIMARY}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Migliora con AI
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Titolo *</span>
            <input className={INPUT} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Categoria *</span>
            <select className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Difficoltà</span>
            <select className={INPUT} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as CommunityRecipeInput["difficulty"] })}>
              {COMMUNITY_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Descrizione</span>
            <textarea className={`${INPUT} min-h-[80px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Foto (URL o base64)</span>
            <input className={INPUT} value={form.photoUrl ?? ""} onChange={(e) => setForm({ ...form, photoUrl: e.target.value || null })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Prep (min)</span>
            <input type="number" className={INPUT} value={form.prepTimeMin} onChange={(e) => setForm({ ...form, prepTimeMin: Number(e.target.value) })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Cottura (min)</span>
            <input type="number" className={INPUT} value={form.cookTimeMin} onChange={(e) => setForm({ ...form, cookTimeMin: Number(e.target.value) })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Porzioni</span>
            <input type="number" className={INPUT} value={form.portions} onChange={(e) => setForm({ ...form, portions: Number(e.target.value) })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Costo teorico (€)</span>
            <input type="number" step="0.01" className={INPUT} value={form.theoreticalCost ?? ""} onChange={(e) => setForm({ ...form, theoreticalCost: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Allergeni</span>
            <input className={INPUT} value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
          </label>
        </div>
      </Card>

      <Card title="Ingredienti">
        <div className="space-y-2">
          {form.ingredients.map((ing, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_80px_auto] gap-2">
              <input className={INPUT} placeholder="Ingrediente" value={ing.name} onChange={(e) => updateIng(idx, "name", e.target.value)} />
              <input type="number" className={INPUT} placeholder="Qty" value={ing.qty || ""} onChange={(e) => updateIng(idx, "qty", Number(e.target.value))} />
              <input className={INPUT} placeholder="Unità" value={ing.unit} onChange={(e) => updateIng(idx, "unit", e.target.value)} />
              <button type="button" onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))} className="rounded-xl border border-rw-line p-2 text-rw-muted hover:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: "", qty: 0, unit: "g" }] }))} className="inline-flex items-center gap-1 text-xs text-rw-accent">
            <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
          </button>
        </div>
      </Card>

      <Card title="Procedimento">
        <div className="space-y-2">
          {form.steps.map((step, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="mt-2.5 w-6 shrink-0 text-xs font-bold text-rw-accent">{idx + 1}</span>
              <textarea className={`${INPUT} min-h-[60px] flex-1`} value={step.text} onChange={(e) => updateStep(idx, e.target.value)} />
              <button type="button" onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }))} className="rounded-xl border border-rw-line p-2 text-rw-muted hover:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { order: f.steps.length + 1, text: "" }] }))} className="inline-flex items-center gap-1 text-xs text-rw-accent">
            <Plus className="h-3.5 w-3.5" /> Aggiungi passaggio
          </button>
        </div>
      </Card>

      <Card title="Dettagli professionali">
        <div className="grid gap-4 md:grid-cols-2">
          {(["chefTips", "techniques", "plating", "variants", "temperatures"] as const).map((field) => (
            <label key={field} className="block space-y-1">
              <span className="text-xs font-medium capitalize text-rw-muted">{field}</span>
              <textarea className={`${INPUT} min-h-[70px]`} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
            </label>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" disabled={saving} className={BTN_PRIMARY}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Pubblica nella Community
      </button>
    </form>
  );
}
