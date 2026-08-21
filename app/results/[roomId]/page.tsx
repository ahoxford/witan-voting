"use client";

import { useEffect, useState, use } from "react";

type Result = { optionId: string; label: string; count: number; percentage: number };
type PhaseResult = { phase: string; results: Result[] };
type Room = { id: string; title: string; question: string; status: string };

const PHASE_NAMES: Record<string, string> = {
  PRE: "Before the Debate",
  LIVE: "During the Debate",
  FINAL: "Final Division",
};

const PHASE_NUMERAL: Record<string, string> = {
  PRE: "I",
  LIVE: "II",
  FINAL: "III",
};

const INKS = [
  { bar: "bg-ox-blue", text: "text-ox-blue" },
  { bar: "bg-claret", text: "text-claret" },
  { bar: "bg-brass", text: "text-brass" },
  { bar: "bg-verdigris", text: "text-verdigris" },
  { bar: "bg-plum", text: "text-plum" },
];

function DivisionTable({ results }: { results: Result[] }) {
  const total = results.reduce((s, r) => s + r.count, 0);

  if (!total) {
    return <p className="text-sm text-ink-faint italic py-2">No votes were recorded in this division.</p>;
  }

  const maxCount = Math.max(...results.map((r) => r.count));

  return (
    <div>
      {results.map((r, i) => {
        const ink = INKS[i % INKS.length];
        const leading = r.count === maxCount && r.count > 0;
        return (
          <div key={r.optionId} className="py-3 border-b border-rule-soft last:border-b-0">
            <div className="flex justify-between items-baseline mb-2 gap-4">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className={`display text-lg truncate ${leading ? "text-ink font-semibold" : "text-ink-mid"}`}>
                  {r.label}
                </span>
                {leading && results.length > 1 && (
                  <span className="label-caps-sm text-gold shrink-0">Carried</span>
                )}
              </div>
              <span className="shrink-0 flex items-baseline gap-2">
                <span className={`figure text-2xl ${leading ? ink.text : "text-ink-mid"}`}>
                  {r.percentage}%
                </span>
                <span className="label-caps-sm text-ink-faint w-8 text-right">{r.count}</span>
              </span>
            </div>
            <div className="h-2.5 bg-paper-sunk overflow-hidden">
              <div
                className={`h-full ${ink.bar} transition-all duration-700 ease-out`}
                style={{ width: `${r.percentage}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="label-caps-sm text-ink-faint pt-3">
        {total} vote{total !== 1 ? "s" : ""} in this division
      </p>
    </div>
  );
}

function OpinionShift({ allPhases }: { allPhases: PhaseResult[] }) {
  const winners = allPhases.map(({ phase, results }) => {
    const total = results.reduce((s, r) => s + r.count, 0);
    if (!total) return { phase, label: "—", pct: 0 };
    const top = results.reduce((a, b) => (a.count >= b.count ? a : b));
    return { phase, label: top.label, pct: top.percentage };
  });

  const voted = winners.filter((w) => w.label !== "—");
  if (voted.length < 2) return null;

  const changed = voted[0].label !== voted[voted.length - 1].label;

  return (
    <section className="mb-10">
      <p className="label-caps text-ink-faint mb-3">The Turn of the House</p>
      <div className="rule-double mb-6" />

      <div className="flex items-stretch justify-between gap-2">
        {winners.map((w, i) => (
          <div key={w.phase} className="flex items-stretch gap-2 flex-1 last:flex-none">
            <div className="flex-1">
              <p className="label-caps-sm text-ink-faint mb-2">{PHASE_NAMES[w.phase]}</p>
              <p className={`display text-lg leading-tight ${w.label === "—" ? "text-ink-faint" : "text-ink font-semibold"}`}>
                {w.label}
              </p>
              {w.pct > 0 && <p className="figure text-sm text-ink-soft mt-1">{w.pct}%</p>}
            </div>
            {i < winners.length - 1 && (
              <div className="flex items-center text-ink-faint px-1 shrink-0" aria-hidden>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className={`mt-5 pt-4 border-t border-rule label-caps ${changed ? "text-gold" : "text-verdigris"}`}>
        {changed ? "The House changed its mind" : "The House held its view"}
      </p>
    </section>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [allPhases, setAllPhases] = useState<PhaseResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/results`)
      .then((r) => r.json())
      .then((data) => {
        setRoom(data.room);
        setAllPhases(data.allPhases || []);
        setLoading(false);
      });
  }, [roomId]);

  const exportData = (format: "csv" | "json") => {
    window.open(`/api/rooms/${roomId}/export?format=${format}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <div className="w-px h-10 bg-ink breathe" />
        <p className="label-caps text-ink-soft">Retrieving the record</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <p className="display text-xl text-claret">This division could not be found.</p>
      </div>
    );
  }

  const totalAllVotes = allPhases.reduce(
    (s, p) => s + p.results.reduce((ps, r) => ps + r.count, 0), 0
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Masthead */}
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="label-caps-sm text-ink-faint">Oxford-Style Debate · Record of Division</p>
            <span className={`label-caps-sm shrink-0 flex items-center gap-1.5 ${
              room.status === "CLOSED" ? "text-ink-faint" : "text-ink"
            }`}>
              {room.status !== "CLOSED" && <span className="w-1.5 h-1.5 rounded-full bg-ink breathe" />}
              {room.status === "CLOSED" ? "Closed" : "Sitting"}
            </span>
          </div>

          <div className="rule-double mb-6" />

          <h1 className="display text-4xl leading-[1.15] font-semibold">{room.title}</h1>

          <p className="label-caps text-ink-faint mt-7 mb-2">The Motion</p>
          <p className="display text-xl leading-snug text-ink-mid border-l-2 border-ink pl-4">
            {room.question}
          </p>

          {totalAllVotes > 0 && (
            <p className="label-caps-sm text-ink-faint mt-6">
              {totalAllVotes} vote{totalAllVotes !== 1 ? "s" : ""} across all divisions
            </p>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => exportData("json")}
              className="label-caps-sm text-ink-soft border border-rule hover:border-ink hover:text-ink px-3 py-2 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportData("csv")}
              className="label-caps-sm text-ink-soft border border-rule hover:border-ink hover:text-ink px-3 py-2 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </header>

        <OpinionShift allPhases={allPhases} />

        <div className="space-y-9">
          {allPhases.map(({ phase, results }) => (
            <section key={phase}>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="figure text-ink-faint text-sm w-6">{PHASE_NUMERAL[phase]}</span>
                <h2 className="display text-xl font-semibold text-ink">
                  {PHASE_NAMES[phase] || phase}
                </h2>
              </div>
              <div className="border-t border-ink pt-1">
                <DivisionTable results={results} />
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 pt-5 border-t border-rule">
          <p className="label-caps-sm text-ink-faint text-center">
            Anonymous ballot · Aggregate results only
          </p>
        </footer>
      </div>
    </div>
  );
}
