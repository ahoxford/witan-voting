"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { Room } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Waiting",
  PRE_VOTE: "Pre-debate Vote",
  LIVE_VOTE: "Live Debate Vote",
  POST_VOTE: "Final Vote",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-gray-700 text-gray-300",
  PRE_VOTE: "bg-blue-900 text-blue-300",
  LIVE_VOTE: "bg-green-900 text-green-300",
  POST_VOTE: "bg-yellow-900 text-yellow-300",
  CLOSED: "bg-red-900 text-red-300",
};

const NEXT_ACTION: Record<string, string> = {
  WAITING: "Open Pre-Debate Vote",
  PRE_VOTE: "Start Live Debate",
  LIVE_VOTE: "Open Final Vote",
  POST_VOTE: "Close & Lock Results",
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
    QRCode.toDataURL(voteUrl, { width: 200, margin: 1 }).then(setQrDataUrl);
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
    if (!confirm("Reset this room? All votes will be deleted.")) return;
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

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold truncate">{room.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[room.status]}`}>
              {STATUS_LABELS[room.status]}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{room.question}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {room.options.map((opt) => (
              <span key={opt.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                {opt.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {room.status !== "CLOSED" && (
            <button
              onClick={advance}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? "…" : NEXT_ACTION[room.status]}
            </button>
          )}
          <button
            onClick={() => setShowQR((v) => !v)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            {showQR ? "Hide QR" : "Show QR"}
          </button>
        </div>
      </div>

      {showQR && (
        <div className="mt-4 border-t border-gray-700 pt-4 flex flex-col sm:flex-row gap-6 items-start">
          <div className="bg-white p-2 rounded-lg">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" width={160} height={160} />}
          </div>
          <div className="text-sm space-y-2 text-gray-400">
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Vote URL</span>
              <a href={voteUrl} target="_blank" className="text-indigo-400 break-all hover:underline">{voteUrl}</a>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Public Screen</span>
              <a href={screenUrl} target="_blank" className="text-indigo-400 break-all hover:underline">{screenUrl}</a>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Results</span>
              <a href={resultsUrl} target="_blank" className="text-indigo-400 break-all hover:underline">{resultsUrl}</a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 flex-wrap border-t border-gray-800 pt-4">
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
        <button
          onClick={reset}
          disabled={loading}
          className="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 px-3 py-1 rounded transition-colors ml-auto"
        >
          Reset Room
        </button>
      </div>
    </div>
  );
}
