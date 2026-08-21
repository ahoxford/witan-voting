"use client";

import { useEffect, useState, useRef, use } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

type Option = { id: string; label: string; order: number };
type Room = { id: string; title: string; question: string; status: string; options: Option[] };
type PhaseVotes = Record<string, string>;

const PHASE_LABELS: Record<string, string> = {
  PRE_VOTE: "Division I · Before the Debate",
  LIVE_VOTE: "Division II · During the Debate",
  POST_VOTE: "Division III · Final Division",
  WAITING: "The House is not yet sitting",
  CLOSED: "The Division is closed",
};

const STATUS_TO_PHASE: Record<string, string> = {
  PRE_VOTE: "PRE",
  LIVE_VOTE: "LIVE",
  POST_VOTE: "FINAL",
};

const PHASE_SHORT: Record<string, string> = {
  PRE: "Before the debate",
  LIVE: "During the debate",
  FINAL: "Final division",
};

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "voting-session-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VotePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [myVotes, setMyVotes] = useState<PhaseVotes>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionId = useRef("");

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();

    const init = async () => {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current }),
      });
      if (!res.ok) { setError("This division could not be found."); return; }
      const data = await res.json();
      setRoom(data.room);
      const voteMap: PhaseVotes = {};
      for (const v of data.votes) voteMap[v.phase] = v.optionId;
      setMyVotes(voteMap);
    };

    init();

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join-room", roomId);

    socket.on("room-update", (data: { room: Room }) => setRoom(data.room));
    socket.on("results-update", (data: { results: { count: number }[] }) => {
      setTotalVotes(data.results.reduce((s, r) => s + r.count, 0));
    });
    socket.on("room-reset", () => { setMyVotes({}); setTotalVotes(null); init(); });

    return () => { socket.disconnect(); };
  }, [roomId]);

  const currentPhase = room ? STATUS_TO_PHASE[room.status] : null;
  const currentVote = currentPhase ? myVotes[currentPhase] : null;
  const isVotingOpen = !!currentPhase;

  const castVote = async (optionId: string) => {
    if (!isVotingOpen || submitting) return;
    setSubmitting(true);
    setOptimisticVote(optionId);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, optionId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Your vote could not be recorded.");
        setOptimisticVote(null);
        return;
      }
      setMyVotes((prev) => ({ ...prev, [currentPhase!]: optionId }));
    } finally {
      setSubmitting(false);
      setOptimisticVote(null);
    }
  };

  if (error && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <p className="display text-xl text-claret text-center">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <div className="w-px h-10 bg-ink breathe" />
        <p className="label-caps text-ink-soft">Entering the chamber</p>
      </div>
    );
  }

  const displayVote = optimisticVote ?? currentVote;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Masthead — printed order-paper header */}
      <header className="border-b border-rule px-6 pt-7 pb-5">
        <p className="label-caps-sm text-ink-faint mb-3">Oxford-Style Debate · Division Paper</p>
        <h1 className="display text-[1.6rem] leading-[1.15] font-semibold text-ink">
          {room.title}
        </h1>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-rule-soft">
          <div className="flex items-center gap-2">
            {isVotingOpen && <span className="w-1.5 h-1.5 rounded-full bg-ink breathe" />}
            <span className={`label-caps-sm ${isVotingOpen ? "text-ink" : "text-ink-faint"}`}>
              {PHASE_LABELS[room.status] || room.status}
            </span>
          </div>
          {totalVotes !== null && isVotingOpen && (
            <span className="label-caps-sm text-ink-faint tabular-nums">
              {totalVotes} cast
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-8 flex flex-col">
        {/* The motion */}
        <p className="label-caps text-ink-faint mb-3">The Motion</p>
        <div className="rule-double mb-5" />
        <p className="display text-[1.75rem] leading-[1.25] text-ink">{room.question}</p>

        {isVotingOpen ? (
          <>
            <p className="mt-7 mb-4 text-sm text-ink-soft leading-relaxed">
              {currentVote
                ? "Your vote stands recorded. You may divide again at any time while the division is open."
                : "Cast your vote by selecting one of the options below."}
            </p>

            <div className="flex flex-col">
              {room.options.map((opt, i) => {
                const selected = displayVote === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => castVote(opt.id)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={`group w-full text-left px-5 py-5 border-l-2 transition-all duration-200
                      active:scale-[0.985] select-none disabled:opacity-50 disabled:cursor-not-allowed
                      ${i === 0 ? "border-t border-t-rule" : ""}
                      border-b border-b-rule
                      ${selected
                        ? "bg-ink border-l-ink"
                        : "bg-paper border-l-transparent hover:bg-paper-warm hover:border-l-ink-faint"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className={`display text-xl leading-snug transition-colors
                        ${selected ? "text-paper font-semibold" : "text-ink"}`}>
                        {opt.label}
                      </span>

                      {/* Ballot mark */}
                      <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200
                        ${selected
                          ? "border-paper bg-paper"
                          : "border-rule bg-transparent group-hover:border-ink-faint"
                        }`}>
                        <svg
                          className={`w-4 h-4 text-ink transition-all duration-200 ${selected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="mt-4 text-sm text-claret border-l-2 border-claret pl-3 py-1">{error}</p>
            )}

            {displayVote && (
              <p className="mt-6 label-caps-sm text-ink-soft flex items-center gap-2">
                <span className="w-4 h-px bg-ink-faint" />
                Vote recorded — changeable while open
              </p>
            )}
          </>
        ) : room.status === "WAITING" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-16">
            <div className="w-12 h-12 rounded-full border border-rule flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-faint breathe" />
            </div>
            <div>
              <p className="display text-xl text-ink">The House is not yet sitting</p>
              <p className="text-sm text-ink-soft mt-2 max-w-[24ch] mx-auto leading-relaxed">
                The division will open when the chair calls it.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-12 w-full">
            <div>
              <p className="display text-xl text-ink">The division is closed</p>
              <p className="text-sm text-ink-soft mt-2">Thank you for taking part.</p>
            </div>

            {Object.keys(myVotes).length > 0 && (
              <div className="mt-2 w-full max-w-xs text-left">
                <p className="label-caps text-ink-faint mb-2">Your divisions</p>
                <div className="border-t border-ink">
                  {Object.entries(myVotes).map(([phase, optId]) => {
                    const opt = room.options.find((o) => o.id === optId);
                    return (
                      <div key={phase} className="flex justify-between items-baseline gap-4 py-2.5 border-b border-rule">
                        <span className="text-xs text-ink-soft">{PHASE_SHORT[phase] || phase}</span>
                        <span className="display text-base text-ink font-semibold">{opt?.label ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="px-6 py-5 border-t border-rule">
        <p className="label-caps-sm text-ink-faint text-center leading-relaxed">
          Anonymous ballot · No identity is recorded
        </p>
      </footer>
    </div>
  );
}
