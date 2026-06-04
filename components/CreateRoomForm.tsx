"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";

export default function CreateRoomForm({
  onCreated,
  onCancel,
}: {
  onCreated: (room: Room) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["For", "Against", "Undecided"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setError("At least 2 non-empty options required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, question, options: filledOptions }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create room");
        return;
      }
      const room = await res.json();
      onCreated(room);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Create New Debate Room</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Debate Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. AI Will Replace Software Engineers"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Do you agree that AI will replace software engineers?"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Vote Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    className="text-gray-500 hover:text-red-400 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-indigo-400 text-sm mt-2 hover:text-indigo-300"
            >
              + Add option
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? "Creating…" : "Create Room"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
