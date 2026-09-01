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
  common: "border-[#642219]",
  rare: "border-[#8f2b1d] shadow-[0_0_14px_rgb(143_43_29/0.16)]",
  epic: "border-[#bc3c22] shadow-[0_0_18px_rgb(188_60_34/0.23)]",
  legendary: "border-[#bd7730] shadow-[0_0_22px_rgb(212_175_60/0.26)]",
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
      <section className="overflow-hidden rounded-3xl border border-[#6e2419] bg-[radial-gradient(circle_at_50%_-10%,#35100d_0%,#100706_42%,#050505_78%)] p-3 shadow-[inset_0_1px_0_rgb(212_175_60/0.12),0_18px_35px_rgb(0_0_0/0.3)]">
        <div className="relative flex items-center justify-between gap-3 border-b border-[#5f2119] pb-3">
          <span className="text-xl text-[#a9271e]">✥</span>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.17em] text-[#dfc08a]">Легенди NEZLAMNI</p>
            <p className="mt-0.5 text-[9px] text-[#b99069]">Відкривай нових за досягнення</p>
          </div>
          <p className="shrink-0 rounded-lg border border-[#8b3a25] bg-black/60 px-2 py-1 text-sm font-black text-[#e8c47e]">{unlockedCount}/16</p>
        </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {items.map((item) => {
          const active = item.slug === activeLegendSlug;
          const percent = Math.min(100, Math.round((item.current / item.target) * 100));
          return (
            <button key={item.slug} type="button" onClick={() => setSelected(item)} aria-label={`${item.name}: ${item.unlocked ? "відкрито" : `${item.current} із ${item.target}`}`} className={`relative min-w-0 overflow-hidden rounded-[10px] border bg-[#080504] text-center ${rarityClass[item.rarity]} ${active ? "ring-2 ring-[#d4af3c] shadow-[0_0_20px_rgb(212_175_60/0.35)]" : ""}`}>
              <div className="relative aspect-square overflow-hidden border-b border-[#672218] bg-black">
                <Image src={item.imagePath} alt={item.name} fill sizes="(max-width: 430px) 22vw, 100px" className={`object-cover transition ${item.unlocked ? "" : "brightness-[0.22] grayscale-[0.45]"}`} />
                {!item.unlocked && <span className="absolute inset-0 grid place-items-center bg-black/15"><LockKeyhole className="text-[#d1b287]" size={17} /></span>}
                {active && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#d4af3c] text-[9px] font-black text-black">✓</span>}
              </div>
              <div className="px-1 py-1.5">
                <p className="truncate text-[9px] font-black leading-3 tracking-wide text-[#dfbd84]">{item.name}</p>
                <p className="mt-0.5 truncate text-[6px] font-black uppercase leading-2 text-[#d63a27]">{item.traits[0]}</p>
                <div className="mt-1 rounded-md border border-[#3f211b] bg-black/75 px-1 py-1">
                  <div className="flex items-center justify-between gap-1 text-[7px] font-black"><span className="truncate text-[#9f8070]">ПРОГРЕС</span><span className="text-[#df4a32]">{item.current}/{item.target}</span></div>
                  <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-[#2b1714]"><div className={`h-full ${item.unlocked ? "bg-[#d4af3c]" : "bg-[#d72c20]"}`} style={{ width: `${item.unlocked ? 100 : percent}%` }} /></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </section>

      {selected && <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/75 p-3" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" className={`max-h-[82vh] w-[70%] max-w-[300px] overflow-y-auto rounded-[24px] border bg-zinc-950 p-3 pb-6 ${rarityClass[selected.rarity]}`} onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)} className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-zinc-800"><X size={18} /></button><div className="relative mx-auto mt-1 aspect-square w-full max-w-[230px] overflow-hidden rounded-2xl"><Image src={selected.imagePath} alt={selected.name} fill sizes="230px" priority className={`object-cover ${selected.unlocked ? "" : "brightness-[0.22] grayscale-[0.45]"}`} />{!selected.unlocked && <span className="absolute inset-0 grid place-items-center"><LockKeyhole size={44} /></span>}</div><p className="mt-3 text-xs font-black uppercase tracking-widest text-[#d4af3c]">{RARITY_LABELS[selected.rarity]}</p><h2 className="mt-1 text-3xl font-black">{selected.name}</h2><p className="mt-2 text-xs font-black text-[#d46b43]">{selected.traits.join(" • ")}</p><p className="mt-3 text-sm leading-6 text-zinc-300">{selected.condition}</p>{selected.unlocked ? <><p className="mt-2 text-xs text-zinc-500">Відкрито {formatDate(selected.unlockedAt)}</p><button disabled={selected.slug === activeLegendSlug || savingSlug === selected.slug} onClick={() => void selectLegend(selected.slug)} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#a51f1c] to-[#d4af3c] p-3 font-black text-white disabled:bg-zinc-800 disabled:bg-none disabled:text-[#d4af3c]">{selected.slug === activeLegendSlug ? "Активна Легенда" : savingSlug === selected.slug ? "Зберігаю..." : "Обрати моєю Легендою"}</button></> : <><div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-gradient-to-r from-[#a8241d] to-[#d4af3c]" style={{ width: `${Math.min(100, (selected.current / selected.target) * 100)}%` }} /></div><p className="mt-2 font-black">{selected.current} / {selected.target}</p><p className="mt-3 text-center text-sm text-zinc-500">Продовжуй шлях, щоб відкрити цю Легенду.</p></>}</div></div>}

      {unlockItem && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-5"><div className="w-full max-w-sm rounded-[32px] border border-[#d4af3c] bg-zinc-950 p-5 text-center shadow-[0_0_45px_rgb(212_175_60/0.28)]"><p className="text-xs font-black tracking-[0.2em] text-[#d4af3c]">НОВА ЛЕГЕНДА ВІДКРИТА</p><div className="relative mx-auto mt-4 aspect-square overflow-hidden rounded-3xl"><Image src={unlockItem.imagePath} alt={unlockItem.name} fill sizes="340px" priority className="object-cover" /></div><h2 className="mt-4 text-3xl font-black">{unlockItem.name}</h2><p className="mt-2 text-xs font-black text-[#d46b43]">{unlockItem.traits.join(" • ")}</p><p className="mt-3 rounded-2xl bg-zinc-900 p-3 text-sm leading-relaxed text-zinc-300">Ти заслужив цю Легенду: {unlockItem.condition}</p><button onClick={() => void selectLegend(unlockItem.slug)} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#a51f1c] to-[#d4af3c] p-4 font-black">Обрати Легендою</button><button onClick={() => void onDismissUnlock(unlockItem.slug)} className="mt-2 w-full p-3 text-sm font-bold text-zinc-400">Продовжити шлях</button></div></div>}

      {isCollectionComplete && <p className="rounded-2xl border border-[#d4af3c] bg-[#2d1b06] p-4 text-center text-sm font-black text-[#ffd86a]">🔥 Колекцію завершено. Титул «НЕЗЛАМНИЙ» відкрито.</p>}
    </>
  );
}
