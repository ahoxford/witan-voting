"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { Room } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Not yet sitting",
  PRE_VOTE: "Division I · Before",
  LIVE_VOTE: "Division II · During",
  POST_VOTE: "Division III · Final",
  CLOSED: "Closed",
};

const NEXT_ACTION: Record<string, string> = {
  WAITING: "Open First Division",
  PRE_VOTE: "Begin the Debate",
  LIVE_VOTE: "Call Final Division",
  POST_VOTE: "Close & Lock",
  CLOSED: "",
};

export default function AdminRoomCard({
  room: initialRoom,
  onUpdate,
}: {
  room: Room;
  onUpdate: () => void;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const voteUrl = `${appUrl}/vote/${room.id}`;
  const screenUrl = `${appUrl}/screen/${room.id}`;
  const resultsUrl = `${appUrl}/results/${room.id}`;

  useEffect(() => {
    QRCode.toDataURL(voteUrl, { width: 200, margin: 0, color: { dark: "#002147", light: "#ffffff" } })
      .then(setQrDataUrl);
  }, [voteUrl]);

  const advance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/phase`, { method: "POST" });
      const data = await res.json();
      if (data.room) setRoom(data.room);
    } finally {
      setLoading(false);
      onUpdate();
    }
  };

  const reset = async () => {
    if (!confirm("Reset this debate? Every vote will be permanently deleted.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/reset`, { method: "POST" });
      const data = await res.json();
      if (data.room) setRoom(data.room);
    } finally {
      setLoading(false);
      onUpdate();
    }
  };

  const exportData = (format: "csv" | "json") => {
    window.open(`/api/rooms/${room.id}/export?format=${format}`, "_blank");
  };

  const isOpen = ["PRE_VOTE", "LIVE_VOTE", "POST_VOTE"].includes(room.status);

  return (
    <article className="border border-rule bg-paper">
      <div className="border-l-2 border-ink px-5 py-5">
        <div className="flex items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-ink breathe" />}
              <span className={`label-caps-sm ${isOpen ? "text-ink" : "text-ink-faint"}`}>
                {STATUS_LABELS[room.status]}
              </span>
            </div>

            <h3 className="display text-xl font-semibold leading-snug truncate">{room.title}</h3>
            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{room.question}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {room.options.map((opt) => (
                <span key={opt.id} className="label-caps-sm text-ink-faint">
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-44">
            {room.status !== "CLOSED" && (
              <button
                onClick={advance}
                disabled={loading}
                className="label-caps bg-ink text-paper px-4 py-2.5 hover:bg-ink-deep disabled:opacity-40 transition-colors text-center"
              >
                {loading ? "…" : NEXT_ACTION[room.status]}
              </button>
            )}
            <button
              onClick={() => setShowQR((v) => !v)}
              className="label-caps border border-rule text-ink-soft hover:border-ink hover:text-ink px-4 py-2.5 transition-colors"
            >
              {showQR ? "Hide Links" : "Show Links"}
            </button>
          </div>
        </div>

        {showQR && (
          <div className="mt-5 pt-5 border-t border-rule flex flex-col sm:flex-row gap-6 items-start">
            <div className="border border-ink p-2.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qrDataUrl && <img src={qrDataUrl} alt="Scan to vote" width={150} height={150} />}
            </div>
            <div className="space-y-3 min-w-0">
              {[
                { label: "Ballot (attendees)", url: voteUrl },
                { label: "Chamber screen", url: screenUrl },
                { label: "Record of division", url: resultsUrl },
              ].map(({ label, url }) => (
                <div key={label}>
                  <p className="label-caps-sm text-ink-faint mb-1">{label}</p>
                  <a
                    href={url}
                    target="_blank"
                    className="text-sm text-ink underline decoration-rule underline-offset-4 hover:decoration-ink break-all"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap border-t border-rule px-5 py-3 bg-paper-warm">
        <button
          onClick={() => exportData("json")}
          className="label-caps-sm text-ink-soft hover:text-ink transition-colors"
        >
          Export JSON
        </button>
        <span className="text-rule">·</span>
        <button
          onClick={() => exportData("csv")}
          className="label-caps-sm text-ink-soft hover:text-ink transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={reset}
          disabled={loading}
          className="label-caps-sm text-claret hover:underline underline-offset-4 ml-auto disabled:opacity-40"
        >
          Reset Debate
        </button>
      </div>
    </article>
  );
}
