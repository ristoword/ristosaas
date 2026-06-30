"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card } from "@/components/shared/card";
import { communityApi, type CommunityChefProfileInput } from "@/lib/api-client";

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-50";

export function CommunityChefProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<CommunityChefProfileInput>({
    displayName: "",
    signature: "",
    bio: "",
    photoUrl: null,
    restaurantName: "",
    city: "",
    country: "Italia",
  });

  useEffect(() => {
    void communityApi
      .getMyChefProfile()
      .then((chef) => {
        if (chef) {
          setForm({
            displayName: chef.displayName,
            signature: chef.signature,
            bio: chef.bio ?? "",
            photoUrl: chef.photoUrl,
            restaurantName: chef.restaurantName,
            city: chef.city,
            country: chef.country,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await communityApi.updateChefProfile(form);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSave(e)}>
      <Card title="Il mio profilo Chef" description="Il profilo pubblico visibile nella Risto Community.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Nome Chef *</span>
            <input className={INPUT} required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Firma Chef</span>
            <input className={INPUT} placeholder="Es. Executive Chef · Cucina creativa" value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Biografia</span>
            <textarea className={`${INPUT} min-h-[100px]`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-rw-muted">Foto profilo (URL)</span>
            <input className={INPUT} value={form.photoUrl ?? ""} onChange={(e) => setForm({ ...form, photoUrl: e.target.value || null })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Ristorante *</span>
            <input className={INPUT} required value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Città</span>
            <input className={INPUT} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-rw-muted">Paese</span>
            <input className={INPUT} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva profilo
          </button>
          {saved && <span className="text-sm text-emerald-400">Profilo aggiornato</span>}
          {error && <span className="text-sm text-rose-400">{error}</span>}
        </div>
      </Card>
    </form>
  );
}
