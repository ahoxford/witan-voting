"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";

const FIELD_CLASS =
  "w-full bg-paper border border-rule px-3.5 py-2.5 text-ink placeholder:text-ink-faint " +
  "focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors";

export default function CreateRoomForm({
  onCreated,
  onCancel,
}: {
  onCreated: (room: Room) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["For the motion", "Against the motion", "Abstain"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setError("At least two options are required.");
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
        setError(d.error || "The debate could not be convened.");
        return;
      }
      onCreated(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-ink bg-paper-warm p-6 mb-8">
      <p className="label-caps text-ink-faint mb-3">New Order Paper</p>
      <div className="rule-double mb-6" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-caps text-ink-soft block mb-2">Debate Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={FIELD_CLASS}
            placeholder="This House believes that…"
          />
        </div>

        <div>
          <label className="label-caps text-ink-soft block mb-2">The Motion</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            className={FIELD_CLASS}
            placeholder="Do you support the motion before the House?"
          />
        </div>

        <div>
          <label className="label-caps text-ink-soft block mb-2">Division Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="figure text-ink-faint text-sm w-5 shrink-0">{i + 1}</span>
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  className={FIELD_CLASS}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    aria-label={`Remove option ${i + 1}`}
                    className="text-ink-faint hover:text-claret px-2 shrink-0 transition-colors"
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
              className="label-caps-sm text-ink hover:underline underline-offset-4 mt-3"
            >
              + Add option
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-claret border-l-2 border-claret pl-3 py-1">{error}</p>
        )}

        <div className="flex gap-3 items-center pt-2 border-t border-rule">
          <button
            type="submit"
            disabled={loading}
            className="label-caps bg-ink text-paper px-6 py-3 hover:bg-ink-deep disabled:opacity-40 transition-colors mt-4"
          >
            {loading ? "Convening…" : "Convene Debate"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="label-caps text-ink-soft hover:text-ink px-3 py-3 transition-colors mt-4"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
