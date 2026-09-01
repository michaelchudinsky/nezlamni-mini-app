"use client";

import Image from "next/image";
import { LockKeyhole, X } from "lucide-react";
import { useState } from "react";
import { LEGENDS as LEGEND_ITEMS, RARITY_LABELS, type LegendDefinition } from "@/lib/legends";

export type LegendItem = LegendDefinition & {
  current: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

type Props = {
  items: LegendItem[];
  activeLegendSlug: string | null;
  isCollectionComplete: boolean;
  pendingUnlock: string | null;
  onSelect: (slug: string) => Promise<void>;
  onDismissUnlock: (slug: string) => Promise<void>;
};

const rarityClass = {
  common: "border-zinc-700",
  rare: "border-[#93451f] shadow-[0_0_18px_rgb(147_69_31/0.12)]",
  epic: "border-[#c44b23] shadow-[0_0_20px_rgb(196_75_35/0.22)]",
  legendary: "border-[#d4af3c] shadow-[0_0_24px_rgb(212_175_60/0.28)]",
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "";

export function LegendBadge({ slug, complete = false }: { slug: string; complete?: boolean }) {
  const item = (awaitedLegend(slug));
  if (!item) return null;
  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[10px] font-black text-[#e3bd54]">
      <span className={`relative h-5 w-5 shrink-0 overflow-hidden rounded-full border ${complete ? "border-[#ffd86a] shadow-[0_0_8px_#d4af3c]" : "border-[#8f6b25]"}`}>
        <Image src={item.imagePath} alt="" fill sizes="20px" className="object-cover" />
      </span>
      <span className="truncate">{item.name}</span>
      {complete && <span className="text-[8px] text-[#ffd86a]">НЕЗЛАМНИЙ</span>}
    </span>
  );
}

function awaitedLegend(slug: string) {
  // Static lookup kept local so badges never fetch data or expose private records.
  return LEGEND_ITEMS.find((item) => item.slug === slug);
}

export default function LegendsCollection({ items, activeLegendSlug, isCollectionComplete, pendingUnlock, onSelect, onDismissUnlock }: Props) {
  const [selected, setSelected] = useState<LegendItem | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const unlockedCount = items.filter((item) => item.unlocked).length;
  const unlockItem = items.find((item) => item.slug === pendingUnlock) || null;

  const selectLegend = async (slug: string) => {
    setSavingSlug(slug);
    try { await onSelect(slug); } finally { setSavingSlug(null); }
  };

  return (
    <>
      <section className="rounded-3xl border border-[#7a251b] bg-[radial-gradient(circle_at_top,#35100d_0%,#18181b_58%)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d4af3c]">Легенди Незламних</p><h2 className="mt-1 text-xl font-black">Твоя колекція</h2></div>
          <p className="shrink-0 rounded-full border border-[#8b6825] bg-black/35 px-3 py-1.5 text-lg font-black text-[#e8c45a]">{unlockedCount}/16</p>
        </div>
        <p className="mt-2 text-xs text-zinc-400">Натисни на тварину, щоб побачити умову та прогрес.</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {items.map((item) => {
          const active = item.slug === activeLegendSlug;
          const percent = Math.min(100, Math.round((item.current / item.target) * 100));
          return (
            <button key={item.slug} type="button" onClick={() => setSelected(item)} aria-label={`${item.name}: ${item.unlocked ? "відкрито" : `${item.current} із ${item.target}`}`} className={`relative min-w-0 overflow-hidden rounded-xl border bg-zinc-950 text-center ${rarityClass[item.rarity]} ${active ? "ring-2 ring-[#d4af3c]" : ""}`}>
              <div className="relative aspect-square overflow-hidden bg-black">
                <Image src={item.imagePath} alt={item.name} fill sizes="(max-width: 430px) 22vw, 100px" className={`object-cover transition ${item.unlocked ? "" : "brightness-[0.22] grayscale-[0.45]"}`} />
                {!item.unlocked && <span className="absolute inset-0 grid place-items-center bg-black/20"><LockKeyhole className="text-zinc-300" size={17} /></span>}
                {active && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#d4af3c] text-[9px] font-black text-black">✓</span>}
              </div>
              <div className="p-1.5">
                <p className="truncate text-[9px] font-black leading-3">{item.name}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${item.unlocked ? "bg-[#d4af3c]" : "bg-gradient-to-r from-[#a8241d] to-[#d4af3c]"}`} style={{ width: `${item.unlocked ? 100 : percent}%` }} /></div>
              </div>
            </button>
          );
        })}
      </div>
      </section>

      {selected && <div className="fixed inset-0 z-[75] flex items-end bg-black/75" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" className={`max-h-[90vh] w-full overflow-y-auto rounded-t-[32px] border-t bg-zinc-950 p-5 pb-28 ${rarityClass[selected.rarity]}`} onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-zinc-800"><X size={18} /></button><div className="relative mx-auto mt-2 aspect-square w-full max-w-sm overflow-hidden rounded-3xl"><Image src={selected.imagePath} alt={selected.name} fill sizes="380px" priority className={`object-cover ${selected.unlocked ? "" : "brightness-[0.22] grayscale-[0.45]"}`} />{!selected.unlocked && <span className="absolute inset-0 grid place-items-center"><LockKeyhole size={44} /></span>}</div><p className="mt-5 text-xs font-black uppercase tracking-widest text-[#d4af3c]">{RARITY_LABELS[selected.rarity]}</p><h2 className="mt-1 text-3xl font-black">{selected.name}</h2><p className="mt-2 text-xs font-black text-[#d46b43]">{selected.traits.join(" • ")}</p><p className="mt-4 text-sm leading-6 text-zinc-300">{selected.condition}</p>{selected.unlocked ? <><p className="mt-3 text-xs text-zinc-500">Відкрито {formatDate(selected.unlockedAt)}</p><button disabled={selected.slug === activeLegendSlug || savingSlug === selected.slug} onClick={() => void selectLegend(selected.slug)} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#a51f1c] to-[#d4af3c] p-4 font-black text-white disabled:bg-zinc-800 disabled:bg-none disabled:text-[#d4af3c]">{selected.slug === activeLegendSlug ? "Активна Легенда" : savingSlug === selected.slug ? "Зберігаю..." : "Обрати моєю Легендою"}</button></> : <><div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-gradient-to-r from-[#a8241d] to-[#d4af3c]" style={{ width: `${Math.min(100, (selected.current / selected.target) * 100)}%` }} /></div><p className="mt-2 font-black">{selected.current} / {selected.target}</p><p className="mt-4 text-center text-sm text-zinc-500">Продовжуй шлях, щоб відкрити цю Легенду.</p></>}</div></div>}

      {unlockItem && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-5"><div className="w-full max-w-sm rounded-[32px] border border-[#d4af3c] bg-zinc-950 p-5 text-center shadow-[0_0_45px_rgb(212_175_60/0.28)]"><p className="text-xs font-black tracking-[0.2em] text-[#d4af3c]">НОВА ЛЕГЕНДА ВІДКРИТА</p><div className="relative mx-auto mt-4 aspect-square overflow-hidden rounded-3xl"><Image src={unlockItem.imagePath} alt={unlockItem.name} fill sizes="340px" priority className="object-cover" /></div><h2 className="mt-4 text-3xl font-black">{unlockItem.name}</h2><p className="mt-2 text-xs font-black text-[#d46b43]">{unlockItem.traits.join(" • ")}</p><p className="mt-3 rounded-2xl bg-zinc-900 p-3 text-sm leading-relaxed text-zinc-300">Ти заслужив цю Легенду: {unlockItem.condition}</p><button onClick={() => void selectLegend(unlockItem.slug)} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#a51f1c] to-[#d4af3c] p-4 font-black">Обрати Легендою</button><button onClick={() => void onDismissUnlock(unlockItem.slug)} className="mt-2 w-full p-3 text-sm font-bold text-zinc-400">Продовжити шлях</button></div></div>}

      {isCollectionComplete && <p className="rounded-2xl border border-[#d4af3c] bg-[#2d1b06] p-4 text-center text-sm font-black text-[#ffd86a]">🔥 Колекцію завершено. Титул «НЕЗЛАМНИЙ» відкрито.</p>}
    </>
  );
}
