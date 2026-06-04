"use client";

import { useEffect, useState, use } from "react";

type Result = { optionId: string; label: string; count: number; percentage: number };
type PhaseResult = { phase: string; results: Result[] };
type Room = { id: string; title: string; question: string; status: string };

const PHASE_NAMES: Record<string, string> = {
  PRE: "Pre-Debate",
  LIVE: "During Debate",
  FINAL: "Final Vote",
};

const BAR_COLORS = ["bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-purple-500"];

function ResultsChart({ results }: { results: Result[] }) {
  if (!results.length) return <p className="text-gray-600 text-sm">No votes recorded.</p>;
  return (
    <div className="space-y-3">
      {results.map((r, i) => (
        <div key={r.optionId}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-gray-400">{r.percentage}% ({r.count})</span>
          </div>
          <div className="h-7 bg-gray-800 rounded-lg overflow-hidden">
            <div
              className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded-lg transition-all duration-500`}
              style={{ width: `${r.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading results…</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Room not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{room.title}</h1>
              <p className="text-gray-400 mt-1">{room.question}</p>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                room.status === "CLOSED"
                  ? "bg-gray-800 text-gray-400"
                  : "bg-green-900 text-green-300"
              }`}
            >
              {room.status === "CLOSED" ? "Closed" : "Live"}
            </span>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => exportData("json")}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1 rounded transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportData("csv")}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1 rounded transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {allPhases.map(({ phase, results }) => (
            <div key={phase} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">{PHASE_NAMES[phase] || phase}</h2>
              <ResultsChart results={results} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
