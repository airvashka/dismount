"use client";

// Rozřazovací board akce:
// - nahoře velký stavový banner (jsi přihlášen / jdeš roli X s velkou ikonou),
// - vlevo party se sloty (drop zóny, jemný filtr rolí Tank/Heal/…),
// - vpravo přihláška (výběr rolí podle priority nebo FILL) a kompaktní
//   karty čekajících, které caller přetahuje myší na sloty.

import { useEffect, useRef, useState, useTransition } from "react";
import { PARTY_MAX, parseOffers } from "@/lib/comp-format";
import { slotIconUrls } from "@/lib/albion";
import { GearChips } from "@/components/gear-chips";
import { ItemIcon } from "@/components/item-icon";
import {
  signUpAction,
  unsignAction,
  assignSlotAction,
} from "@/app/akce/actions";
import { DevAddTestUser } from "@/components/dev-add-test-user";

export type BoardSlot = {
  id: number;
  party: string;
  role_name: string;
  build: string;
  note: string;
};

export type BoardSignup = {
  id: number;
  slot_id: number | null;
  discord_id: string;
  display_name: string;
  note: string;
  offers: string;
};

/** Kompaktní zobrazení nabídek hráče: FILL + očíslované ikony rolí. */
function OfferChips({
  offers,
  slots,
  size = 20,
}: {
  offers: string[];
  slots: BoardSlot[];
  size?: number;
}) {
  if (offers.length === 0) return null;
  let order = 0;
  return (
    <span className="inline-flex flex-nowrap items-center gap-1 whitespace-nowrap">
      {offers.map((o) => {
        if (o === "FILL") {
          return (
            <span
              key="FILL"
              className="rounded border border-emerald-500 px-1.5 py-px text-[11px] font-semibold text-emerald-400"
            >
              FILL
            </span>
          );
        }
        order++;
        const slot = slots.find((s) => s.role_name === o);
        const icons = slotIconUrls(o, slot?.build ?? "");
        return (
          <span
            key={o}
            title={o}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted"
          >
            <span className="font-semibold text-accent">{order}.</span>
            {icons.length > 0
              ? icons.map((u, i) => <ItemIcon key={i} src={u} size={size} />)
              : <span>{o}</span>}
          </span>
        );
      })}
    </span>
  );
}

export function EventBoard({
  eventId,
  slots,
  signups: initialSignups,
  discordId,
  canSignup,
  isCaller,
  showDevTools = false,
}: {
  eventId: number;
  slots: BoardSlot[];
  signups: BoardSignup[];
  discordId: string;
  canSignup: boolean;
  isCaller: boolean;
  /** Local sandbox: add simulated Test user N signups. */
  showDevTools?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [signups, setSignups] = useState(initialSignups);
  const [signupsSource, setSignupsSource] = useState(initialSignups);
  if (initialSignups !== signupsSource) {
    setSignupsSource(initialSignups);
    setSignups(initialSignups);
  }
  const [dragged, setDragged] = useState<BoardSignup | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [hoverPanel, setHoverPanel] = useState(false);
  const [pickedRoles, setPickedRoles] = useState<string[]>([]);
  const [fill, setFill] = useState(false);
  const draggedRef = useRef<BoardSignup | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/akce/${eventId}/stav`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.signups)) setSignups(data.signups);
      } catch {
        /* retry next interval */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventId]);

  // Pointer drag (not HTML5 DnD) so wheel scroll keeps working.
  useEffect(() => {
    if (!dragged) return;
    draggedRef.current = dragged;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const EDGE = 72;
    const MAX_SPEED = 32;

    const hitTest = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const slotEl = el?.closest("[data-drop-slot]") as HTMLElement | null;
      const waitEl = el?.closest("[data-drop-waiting]");
      if (slotEl?.dataset.dropSlot) {
        setHoverSlot(Number(slotEl.dataset.dropSlot));
        setHoverPanel(false);
        return;
      }
      if (waitEl) {
        setHoverSlot(null);
        setHoverPanel(true);
        return;
      }
      setHoverSlot(null);
      setHoverPanel(false);
    };

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      hitTest(e.clientX, e.clientY);
      const vh = window.innerHeight;
      if (e.clientY < EDGE) {
        window.scrollBy(0, -Math.ceil((MAX_SPEED * (EDGE - e.clientY)) / EDGE));
      } else if (e.clientY > vh - EDGE) {
        window.scrollBy(
          0,
          Math.ceil((MAX_SPEED * (e.clientY - (vh - EDGE))) / EDGE)
        );
      }
    };

    const endDrag = (e: PointerEvent) => {
      const current = draggedRef.current;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest("[data-drop-slot]") as HTMLElement | null;
      const waitEl = el?.closest("[data-drop-waiting]");
      if (current && slotEl?.dataset.dropSlot) {
        const fd = new FormData();
        fd.set("event_id", String(eventId));
        fd.set("slot_id", slotEl.dataset.dropSlot);
        fd.set("signup_id", String(current.id));
        startTransition(() => void assignSlotAction(fd));
      } else if (current?.slot_id != null && waitEl) {
        const fd = new FormData();
        fd.set("event_id", String(eventId));
        fd.set("slot_id", String(current.slot_id));
        fd.set("signup_id", "");
        startTransition(() => void assignSlotAction(fd));
      }
      draggedRef.current = null;
      setDragged(null);
      setDragPos(null);
      setHoverSlot(null);
      setHoverPanel(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragged, eventId, startTransition]);

  const startPointerDrag = (signup: BoardSignup, e: React.PointerEvent) => {
    if (!isCaller || e.button !== 0) return;
    e.preventDefault();
    setDragged(signup);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const bySlot = new Map(signups.filter((s) => s.slot_id).map((s) => [s.slot_id, s]));
  const waiting = signups.filter((s) => s.slot_id === null);
  const mySignup = signups.find((s) => s.discord_id === discordId);
  const mySlot = mySignup?.slot_id
    ? slots.find((s) => s.id === mySignup.slot_id)
    : null;

  const groups: { name: string; slots: BoardSlot[] }[] = [];
  for (const s of slots) {
    const last = groups[groups.length - 1];
    if (last && last.name === s.party) last.slots.push(s);
    else groups.push({ name: s.party, slots: [s] });
  }

  const distinctRoles = [...new Set(slots.map((s) => s.role_name))];

  const slotMatchesDragged = (slot: BoardSlot): boolean => {
    if (!dragged) return false;
    const offers = parseOffers(dragged.offers);
    return offers.length === 0 || offers.includes("FILL") || offers.includes(slot.role_name);
  };

  const toggleRole = (role: string) =>
    setPickedRoles((r) =>
      r.includes(role) ? r.filter((x) => x !== role) : r.length < 3 ? [...r, role] : r
    );

  const myPartyName = mySlot
    ? groups.find((g) => g.slots.some((s) => s.id === mySlot.id))?.name || null
    : null;

  return (
    <div className="mt-6">
      {dragged && dragPos && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-2 rounded border border-accent bg-surface px-2.5 py-1.5 text-sm shadow-lg"
          style={{ left: dragPos.x + 12, top: dragPos.y + 12 }}
        >
          <span className="text-muted select-none" aria-hidden>
            ⠿
          </span>
          <span className="font-medium whitespace-nowrap">
            {dragged.display_name}
          </span>
          <OfferChips
            offers={parseOffers(dragged.offers)}
            slots={slots}
            size={30}
          />
        </div>
      )}
      {mySignup && (
        <div
          className={
            "flex items-center justify-between gap-4 rounded-lg border p-3 " +
            (mySlot
              ? "border-emerald-500/60 bg-emerald-950/30"
              : "border-amber-500/60 bg-amber-950/20")
          }
        >
          <div className="flex items-center gap-3">
            {mySlot ? (
              <>
                {slotIconUrls(mySlot.role_name, mySlot.build).map((u, i) => (
                  <ItemIcon key={i} src={u} size={44} />
                ))}
                <div>
                  <div className="font-semibold text-emerald-400">
                    ✔ Jdeš: {mySlot.role_name}
                    {myPartyName && (
                      <span className="font-normal text-muted"> · {myPartyName}</span>
                    )}
                  </div>
                  {mySlot.build && (
                    <div className="mt-0.5 text-xs text-muted">
                      <GearChips text={mySlot.build} size={16} nowrap />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="font-semibold text-amber-400">
                  ✋ Jsi přihlášen — čekáš na rozřazení callerem
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  nabízíš:{" "}
                  <OfferChips offers={parseOffers(mySignup.offers)} slots={slots} />
                </div>
              </div>
            )}
          </div>
          {canSignup && (
            <form action={unsignAction}>
              <input type="hidden" name="event_id" value={eventId} />
              <button
                type="submit"
                className="whitespace-nowrap text-xs text-muted hover:text-red-400 cursor-pointer"
              >
                odhlásit se
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-4 gap-6 md:grid md:grid-cols-[1fr_380px] md:items-start">
        {/* Levý sloupec — party */}
        <div>
          {groups.map((group, gi) => {
            const takenCount = group.slots.filter((s) => bySlot.has(s.id)).length;
            return (
              <section key={gi} className="mt-4">
                <h2 className="flex items-baseline gap-3 font-semibold">
                  {group.name || (groups.length > 1 ? `Parta ${gi + 1}` : "Kompozice")}
                  <span
                    className={
                      "text-xs font-normal " +
                      (takenCount === group.slots.length
                        ? "text-emerald-400"
                        : takenCount > 0
                          ? "text-amber-400"
                          : "text-muted")
                    }
                  >
                    {takenCount === group.slots.length
                      ? "✓ kompletní"
                      : `${takenCount}/${group.slots.length} obsazeno`}
                  </span>
                  {group.slots.length > PARTY_MAX && (
                    <span className="text-xs font-normal text-red-400">
                      ⚠ víc než {PARTY_MAX} slotů
                    </span>
                  )}
                </h2>
                <div className="mt-2 h-1 overflow-hidden rounded bg-border">
                  <div
                    className={
                      "h-full rounded transition-all " +
                      (takenCount === group.slots.length ? "bg-emerald-500" : "bg-accent")
                    }
                    style={{
                      width: `${(takenCount / Math.max(1, group.slots.length)) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <tbody>
                      {group.slots.map((slot) => {
                        const taken = bySlot.get(slot.id);
                        const isMine = taken?.discord_id === discordId;
                        const icons = slotIconUrls(slot.role_name, slot.build);
                        const droppable = isCaller && dragged;
                        const matched = slotMatchesDragged(slot);
                        // Při tažení: sedící sloty výrazně svítí, ostatní se ztlumí
                        const dimmed = Boolean(dragged) && !matched && !taken;
                        return (
                          <tr
                            key={slot.id}
                            data-drop-slot={droppable ? slot.id : undefined}
                            className={
                              "group border-t border-border first:border-t-0 transition-all " +
                              (dimmed ? "opacity-30 " : "") +
                              (hoverSlot === slot.id
                                ? "bg-accent/40 shadow-[inset_0_0_0_2px_var(--accent)] "
                                : matched && !taken
                                  ? "bg-accent/15 shadow-[inset_3px_0_0_var(--accent)] "
                                  : "")
                            }
                          >
                            <td
                              className={
                                "border-l-2 px-2 py-1 font-medium " +
                                (taken ? "border-l-red-500/60" : "border-l-emerald-500/60")
                              }
                            >
                              <span className="flex items-center gap-1.5">
                                {icons.map((u, i) => (
                                  <ItemIcon key={i} src={u} size={29} />
                                ))}
                                <span className="whitespace-nowrap">{slot.role_name}</span>
                              </span>
                            </td>
                            <td className="px-2 py-1 text-muted">
                              <GearChips
                                text={[slot.build, slot.note].filter(Boolean).join(", ")}
                                size={26}
                                nowrap
                                iconOnly
                              />
                            </td>
                            <td className="px-2 py-1">
                              {taken ? (
                                <span
                                  onPointerDown={
                                    isCaller
                                      ? (e) => startPointerDrag(taken, e)
                                      : undefined
                                  }
                                  title={isCaller ? "Přetáhni na jiný slot nebo do „K rozřazení“" : undefined}
                                  className={
                                    "whitespace-nowrap " +
                                    (isMine ? "text-accent " : "text-red-300 ") +
                                    (isCaller
                                      ? "inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-0.5 cursor-grab active:cursor-grabbing hover:border-accent transition-colors touch-none select-none "
                                      : "") +
                                    (dragged?.id === taken.id ? "opacity-50" : "")
                                  }
                                >
                                  {isCaller && (
                                    <span className="text-muted select-none" aria-hidden>
                                      ⠿
                                    </span>
                                  )}
                                  {taken.display_name}
                                </span>
                              ) : (
                                <span className="text-emerald-400">volný</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        {/* Pravý sloupec — přihláška + čekající hráči */}
        <aside className="mt-6 md:mt-0 md:sticky md:top-16 space-y-4">
          {canSignup && !mySignup && (
            <form
              action={signUpAction}
              className="rounded-lg border border-accent/40 bg-surface p-3"
            >
              <input type="hidden" name="event_id" value={eventId} />
              {pickedRoles.map((r) => (
                <input key={r} type="hidden" name="offer" value={r} />
              ))}
              {fill && <input type="hidden" name="fill" value="1" />}

              <div className="text-sm font-semibold">Přihlásit se</div>
              <p className="mt-1 text-xs text-muted">
                Naklikej, co můžeš hrát — <b>max 3 role podle priority</b>{" "}
                (1. = nejradši). Nebo zapni FILL = zahraju cokoliv.
              </p>

              <button
                type="button"
                onClick={() => setFill((f) => !f)}
                className={
                  "mt-2 w-full rounded border px-2 py-1.5 text-sm font-semibold cursor-pointer transition-colors " +
                  (fill
                    ? "border-emerald-500 bg-emerald-500 text-background"
                    : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10")
                }
              >
                {fill ? "✓ FILL — zahraju cokoliv" : "FILL — zahraju cokoliv"}
              </button>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {distinctRoles.map((role) => {
                  const idx = pickedRoles.indexOf(role);
                  const icons = slotIconUrls(role, "");
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={
                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs cursor-pointer " +
                        (idx >= 0
                          ? "border-accent bg-accent/20 text-accent font-semibold"
                          : "border-border text-muted hover:border-accent")
                      }
                    >
                      {idx >= 0 && (
                        <span className="rounded bg-accent px-1 text-[10px] font-bold text-background">
                          {idx + 1}.
                        </span>
                      )}
                      {icons.map((u, i) => (
                        <ItemIcon key={i} src={u} size={16} />
                      ))}
                      {role}
                    </button>
                  );
                })}
              </div>

              {(pickedRoles.length > 0 || fill) && (
                <div className="mt-2 rounded bg-background/60 px-2 py-1 text-xs">
                  <span className="text-muted">Tvoje nabídka: </span>
                  {fill && (
                    <span className="font-semibold text-emerald-400">
                      FILL{pickedRoles.length > 0 && " + "}
                    </span>
                  )}
                  <span className="text-accent">
                    {pickedRoles.map((r, i) => `${i + 1}. ${r}`).join(" · ")}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={pickedRoles.length === 0 && !fill}
                className="mt-2 w-full rounded bg-accent px-3 py-1.5 text-sm font-medium text-background hover:bg-accent-hover cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Přihlásit se
              </button>
              {pickedRoles.length === 0 && !fill && (
                <p className="mt-1 text-center text-[11px] text-muted">
                  vyber aspoň jednu roli nebo FILL
                </p>
              )}
            </form>
          )}

          {showDevTools && (
            <DevAddTestUser eventId={eventId} roles={distinctRoles} />
          )}

          <div
            data-drop-waiting={
              isCaller && dragged?.slot_id != null ? "1" : undefined
            }
            className={
              "rounded-lg border-2 border-dashed p-2 -m-2 transition-colors " +
              (dragged?.slot_id != null && hoverPanel
                ? "border-accent bg-accent/10"
                : "border-border")
            }
          >
            <h2 className="text-sm font-semibold">
              K rozřazení {waiting.length > 0 && `(${waiting.length})`}
            </h2>
            {isCaller && (waiting.length > 0 || dragged?.slot_id != null) && (
              <p className="mt-0.5 text-xs text-muted">
                {dragged?.slot_id != null
                  ? "Pusť hráče sem — vrátí se mezi čekající."
                  : "Přetáhni hráče myší na slot v kompozici."}
              </p>
            )}
            {waiting.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Nikdo nečeká.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {waiting.map((s) => {
                  const offers = parseOffers(s.offers);
                  return (
                    <li
                      key={s.id}
                      onPointerDown={
                        isCaller ? (e) => startPointerDrag(s, e) : undefined
                      }
                      title={s.note || undefined}
                      className={
                        "flex items-center gap-2 rounded border border-border bg-surface px-2.5 py-1.5 text-sm " +
                        (isCaller
                          ? "cursor-grab active:cursor-grabbing hover:border-accent touch-none select-none "
                          : "") +
                        (dragged?.id === s.id ? "opacity-50 " : "")
                      }
                    >
                      {isCaller && (
                        <span className="text-muted select-none" aria-hidden>
                          ⠿
                        </span>
                      )}
                      <span
                        className={
                          "font-medium whitespace-nowrap " +
                          (s.discord_id === discordId ? "text-accent" : "")
                        }
                      >
                        {s.display_name}
                      </span>
                      <OfferChips offers={offers} slots={slots} size={30} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
