"use client";

import { useEffect, useState, useRef, use } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

type Option = { id: string; label: string; order: number };
type Room = { id: string; title: string; question: string; status: string; options: Option[] };
type PhaseVotes = Record<string, string>; // phase -> optionId

const PHASE_LABELS: Record<string, string> = {
  PRE_VOTE: "Pre-Debate",
  LIVE_VOTE: "Live Debate",
  POST_VOTE: "Final Vote",
  WAITING: "Waiting",
  CLOSED: "Closed",
};

const STATUS_TO_PHASE: Record<string, string> = {
  PRE_VOTE: "PRE",
  LIVE_VOTE: "LIVE",
  POST_VOTE: "FINAL",
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
      if (!res.ok) {
        setError("Room not found.");
        return;
      }
      const data = await res.json();
      setRoom(data.room);

      // Map existing votes by phase
      const voteMap: PhaseVotes = {};
      for (const v of data.votes) {
        voteMap[v.phase] = v.optionId;
      }
      setMyVotes(voteMap);
    };

    init();

    // Socket for live room status updates
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join-room", roomId);
    socket.on("room-update", (data: { room: Room }) => {
      setRoom(data.room);
    });
    socket.on("room-reset", () => {
      setMyVotes({});
      init();
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  const currentPhase = room ? STATUS_TO_PHASE[room.status] : null;
  const currentVote = currentPhase ? myVotes[currentPhase] : null;
  const isVotingOpen = !!currentPhase;

  const castVote = async (optionId: string) => {
    if (!isVotingOpen) return;
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
        setError(d.error || "Failed to submit vote");
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading…</div>
      </div>
    );
  }

  const displayVote = optimisticVote ?? currentVote;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-4">
        <h1 className="text-lg font-bold leading-tight">{room.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isVotingOpen
                ? "bg-green-900 text-green-300 animate-pulse"
                : room.status === "CLOSED"
                ? "bg-gray-800 text-gray-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {PHASE_LABELS[room.status] || room.status}
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-5">
        <p className="text-white text-xl font-semibold leading-snug">{room.question}</p>

        {isVotingOpen ? (
          <>
            <p className="text-gray-400 text-sm">
              {currentVote
                ? "You can change your vote at any time."
                : "Tap to cast your vote."}
            </p>

            <div className="space-y-3">
              {room.options.map((opt) => {
                const selected = displayVote === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => castVote(opt.id)}
                    disabled={submitting}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold text-base transition-all duration-150 ${
                      selected
                        ? "border-indigo-500 bg-indigo-950 text-indigo-200"
                        : "border-gray-700 bg-gray-800 text-white hover:border-gray-500 active:scale-98"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      {selected && (
                        <span className="text-indigo-400 text-lg">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {displayVote && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300">
                Your vote has been recorded. You can change it anytime while voting is open.
              </div>
            )}
          </>
        ) : room.status === "WAITING" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <div className="text-4xl">⏳</div>
            <p className="text-lg">Voting hasn&apos;t started yet.</p>
            <p className="text-sm">Please wait for the organizer to open voting.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <div className="text-4xl">🔒</div>
            <p className="text-lg">Voting is closed.</p>
            <p className="text-sm">Thank you for participating!</p>
            {Object.keys(myVotes).length > 0 && (
              <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-left w-full max-w-xs">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your votes</p>
                {Object.entries(myVotes).map(([phase, optId]) => {
                  const opt = room.options.find((o) => o.id === optId);
                  return (
                    <div key={phase} className="flex justify-between text-sm py-1">
                      <span className="text-gray-400">{phase}</span>
                      <span className="text-white font-medium">{opt?.label ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="px-5 py-4 text-center text-xs text-gray-600 border-t border-gray-800">
        Anonymous voting — your identity is never recorded
      </footer>
    </div>
  );
}
