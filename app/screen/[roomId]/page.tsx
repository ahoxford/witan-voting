"use client";

import { useEffect, useState, useRef, use } from "react";
import { io, Socket } from "socket.io-client";

type Option = { id: string; label: string; order: number };
type Room = { id: string; title: string; question: string; status: string; options: Option[] };
type Result = { optionId: string; label: string; count: number; percentage: number };

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  WAITING: { label: "Waiting to Start", color: "text-gray-400" },
  PRE_VOTE: { label: "Pre-Debate Vote Open", color: "text-blue-400" },
  LIVE_VOTE: { label: "Live Debate — Voting Open", color: "text-green-400" },
  POST_VOTE: { label: "Final Vote Open", color: "text-yellow-400" },
  CLOSED: { label: "Voting Closed", color: "text-gray-400" },
};

const BAR_COLORS = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-pink-500",
];

export default function ScreenPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchInitial = async () => {
    const res = await fetch(`/api/rooms/${roomId}/results`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setResults(data.currentResults || []);
    setPhase(data.currentPhase);
  };

  useEffect(() => {
    fetchInitial();

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join-screen", roomId);

    socket.on("results-update", (data: { results: Result[]; phase: string }) => {
      setResults(data.results);
      setPhase(data.phase);
    });

    socket.on("room-update", (data: { room: Room; results: Result[] }) => {
      setRoom(data.room);
      setResults(data.results || []);
    });

    socket.on("room-reset", () => {
      setResults([]);
      setPhase(null);
      fetchInitial();
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400 text-2xl">Loading…</div>
      </div>
    );
  }

  const phaseInfo = PHASE_LABELS[room.status] || { label: room.status, color: "text-gray-400" };
  const totalVotes = results.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col px-12 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold tracking-tight leading-tight">{room.title}</h1>
        <p className="text-gray-400 text-2xl mt-3">{room.question}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span
            className={`text-xl font-semibold ${phaseInfo.color} ${
              ["PRE_VOTE", "LIVE_VOTE", "POST_VOTE"].includes(room.status)
                ? "animate-pulse"
                : ""
            }`}
          >
            ● {phaseInfo.label}
          </span>
          {totalVotes > 0 && (
            <span className="text-gray-600 text-lg">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Results bars */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full gap-6">
        {results.length === 0 ? (
          <p className="text-center text-gray-600 text-2xl">Waiting for votes…</p>
        ) : (
          results.map((r, i) => (
            <div key={r.optionId} className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-bold">{r.label}</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold tabular-nums">{r.percentage}%</span>
                  <span className="text-gray-500 text-xl tabular-nums">({r.count})</span>
                </div>
              </div>
              <div className="h-12 bg-gray-900 rounded-xl overflow-hidden">
                <div
                  className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded-xl transition-all duration-700 ease-out`}
                  style={{ width: `${r.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-10 text-gray-700 text-sm">
        Anonymous live voting — aggregate results only
      </div>
    </div>
  );
}
