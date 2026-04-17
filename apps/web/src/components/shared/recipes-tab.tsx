"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { kitchenApi, type Recipe } from "@/lib/api-client";

type RecipeArea = "cucina" | "pizzeria" | "bar";

type Props = {
  area: RecipeArea;
  title: string;
  description?: string;
};

/**
 * Shared read/create recipe tab backed by the real kitchen API.
 * Used by pizzeria/bar tabs (and can be reused elsewhere).
 */
export function RecipesTab({ area, title, description }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await kitchenApi.listRecipes();
      setRecipes(all.filter((r) => r.area === area));
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Errore caricamento ricette");
    } finally {
      setLoading(false);
    }
  }, [area]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await kitchenApi.createRecipe({
        name: name.trim(),
        category: category.trim() || "generale",
        area,
        portions: 1,
        sellingPrice: price,
        targetFcPct: 30,
        ivaPct: 10,
        overheadPct: 5,
        packagingCost: 0,
        laborCost: 0,
        energyCost: 0,
        ingredients: [],
        steps: [],
        notes: notes.trim(),
      });
      setName("");
      setCategory("");
      setPrice(0);
      setNotes("");
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore salvataggio ricetta");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questa ricetta?")) return;
    try {
      await kitchenApi.deleteRecipe(id);
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore eliminazione");
    }
  }

  return (
    <div className="space-y-6">
      <Card title={title} description={description}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria"
              className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              placeholder="Prezzo €"
              className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salva
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note / istruzioni (facoltativo)"
            rows={3}
            className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
          />
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt py-10 text-sm text-rw-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carico le ricette dal database…
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Nome",
              render: (row) => <span className="font-semibold text-rw-ink">{row.name}</span>,
            },
            { key: "category", header: "Categoria" },
            {
              key: "sellingPrice",
              header: "Prezzo €",
              render: (row) => <span className="tabular-nums">€{row.sellingPrice.toFixed(2)}</span>,
            },
            {
              key: "ingredients",
              header: "Ingredienti",
              render: (row) => <span className="text-rw-muted">{row.ingredients.length}</span>,
            },
            {
              key: "notes",
              header: "Note",
              render: (row) => <span className="text-rw-muted">{row.notes}</span>,
            },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10"
                  title="Elimina"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ),
            },
          ]}
          data={recipes}
          keyExtractor={(row) => row.id}
          emptyMessage={`Nessuna ricetta ${area} salvata. Aggiungi la prima qui sopra.`}
        />
      )}
    </div>
  );
}
