"use client";

import { useEffect, useState, useRef, use } from "react";
import { io, Socket } from "socket.io-client";
import QRCode from "qrcode";

type Option = { id: string; label: string; order: number };
type Room = { id: string; title: string; question: string; status: string; options: Option[] };
type Result = { optionId: string; label: string; count: number; percentage: number };

const PHASE_LABELS: Record<string, string> = {
  WAITING: "The House is not yet sitting",
  PRE_VOTE: "Division I · Before the Debate",
  LIVE_VOTE: "Division II · During the Debate",
  POST_VOTE: "Division III · Final Division",
  CLOSED: "The Division is closed",
};

/* Muted letterpress inks — legible when projected onto a white ground */
const INKS = [
  { bar: "bg-ox-blue", text: "text-ox-blue" },
  { bar: "bg-claret", text: "text-claret" },
  { bar: "bg-brass", text: "text-brass" },
  { bar: "bg-verdigris", text: "text-verdigris" },
  { bar: "bg-plum", text: "text-plum" },
];

export default function ScreenPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const fetchInitial = async () => {
    const res = await fetch(`/api/rooms/${roomId}/results`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setResults(data.currentResults || []);
  };

  useEffect(() => {
    fetchInitial();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    QRCode.toDataURL(`${appUrl}/vote/${roomId}`, {
      width: 320,
      margin: 0,
      color: { dark: "#002147", light: "#ffffff" },
    }).then(setQrDataUrl);

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join-screen", roomId);

    socket.on("results-update", (data: { results: Result[] }) => setResults(data.results));
    socket.on("room-update", (data: { room: Room; results: Result[] }) => {
      setRoom(data.room);
      setResults(data.results || []);
    });
    socket.on("room-reset", () => { setResults([]); fetchInitial(); });

    return () => { socket.disconnect(); };
  }, [roomId]);

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="w-px h-14 bg-ink breathe" />
        <p className="label-caps text-ink-soft">Preparing the division</p>
      </div>
    );
  }

  const totalVotes = results.reduce((s, r) => s + r.count, 0);
  const isLive = ["PRE_VOTE", "LIVE_VOTE", "POST_VOTE"].includes(room.status);
  const maxCount = results.length ? Math.max(...results.map((r) => r.count)) : 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const voteUrl = `${appUrl}/vote/${roomId}`;

  /* ---- Waiting: the QR takes the whole stage ---- */
  if (room.status === "WAITING") {
    return (
      <div className="min-h-screen flex flex-col px-20 py-14">
        <header className="text-center">
          <p className="label-caps text-ink-faint mb-5">Oxford-Style Debate</p>
          <div className="rule-double max-w-3xl mx-auto mb-7" />
          <h1 className="display text-6xl leading-[1.1] font-semibold max-w-4xl mx-auto">
            {room.title}
          </h1>
          <p className="display text-3xl text-ink-mid mt-6 max-w-3xl mx-auto leading-snug">
            {room.question}
          </p>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="label-caps text-ink">Scan to take your seat</p>
          {qrDataUrl && (
            <div className="border-2 border-ink p-5 bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Scan to vote" width={260} height={260} />
            </div>
          )}
          <p className="text-ink-soft text-lg tracking-wide">{voteUrl}</p>
        </div>

        <footer className="flex items-center justify-center gap-3 border-t border-rule pt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint breathe" />
          <p className="label-caps text-ink-faint">Awaiting the chair</p>
        </footer>
      </div>
    );
  }

  /* ---- Live division ----
     Sized in viewport units so the whole board fits any projector
     (720p through 4K) without ever scrolling. */
  return (
    <div className="h-screen overflow-hidden flex flex-col px-[4vw] py-[3vh]">
      <header className="border-b border-ink pb-[2vh]">
        <div className="flex items-start justify-between gap-10">
          <div className="flex-1 min-w-0">
            <p className="label-caps text-ink-faint mb-[1vh]">Oxford-Style Debate</p>
            <h1 className="display font-semibold leading-[1.1] text-[clamp(1.75rem,3.4vw,3.25rem)]">
              {room.title}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-2.5">
              {isLive && <span className="w-2 h-2 rounded-full bg-ink breathe" />}
              <span className="label-caps text-ink">{PHASE_LABELS[room.status]}</span>
            </div>
            <p className="figure text-[clamp(1.5rem,2.6vw,2.5rem)] mt-[1vh] text-ink leading-none">
              {totalVotes}
            </p>
            <p className="label-caps-sm text-ink-faint mt-1">
              Vote{totalVotes !== 1 ? "s" : ""} cast
            </p>
          </div>
        </div>
      </header>

      {/* The motion */}
      <div className="py-[2.2vh] border-b border-rule shrink-0">
        <p className="label-caps text-ink-faint mb-[0.8vh]">The Motion</p>
        <p className="display leading-snug text-ink max-w-5xl text-[clamp(1.1rem,2.2vw,2.15rem)]">
          {room.question}
        </p>
      </div>

      {/* Division results */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-[3vh] py-[2vh] max-w-6xl w-full mx-auto">
        {results.length === 0 || totalVotes === 0 ? (
          <div className="flex flex-col items-center gap-7">
            <p className="display text-3xl text-ink-faint">No votes have yet been cast</p>
            {qrDataUrl && (
              <>
                <div className="border-2 border-ink p-4 bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Scan to vote" width={190} height={190} />
                </div>
                <p className="label-caps text-ink-soft">Scan to vote · {voteUrl}</p>
              </>
            )}
          </div>
        ) : (
          results.map((r, i) => {
            const ink = INKS[i % INKS.length];
            const leading = r.count === maxCount && r.count > 0;
            return (
              <div key={r.optionId}>
                <div className="flex justify-between items-end mb-[1vh] gap-6">
                  <div className="flex items-baseline gap-4 min-w-0">
                    <span className={`display font-semibold truncate text-[clamp(1.1rem,2.3vw,2.25rem)] ${leading ? ink.text : "text-ink-mid"}`}>
                      {r.label}
                    </span>
                    {leading && results.length > 1 && (
                      <span className="label-caps text-gold shrink-0">Leading</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-4 shrink-0">
                    <span className={`figure leading-none text-[clamp(2rem,4.6vw,4.5rem)] ${leading ? ink.text : "text-ink-mid"}`}>
                      {r.percentage}%
                    </span>
                    <span className="label-caps text-ink-faint w-16 text-right">
                      {r.count} {r.count === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                </div>

                {/* Ink bar on paper */}
                <div className="h-[clamp(1.5rem,4.5vh,2.75rem)] bg-paper-sunk border border-rule overflow-hidden">
                  <div
                    className={`h-full ${ink.bar} bar-ink transition-all duration-700 ease-out`}
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Standing footer keeps the QR available to latecomers */}
      <footer className="border-t border-rule pt-[1.5vh] flex items-center justify-between shrink-0">
        <p className="label-caps-sm text-ink-faint">Anonymous ballot · Aggregate results only</p>
        {room.status !== "CLOSED" && qrDataUrl && (
          <div className="flex items-center gap-4">
            <p className="label-caps-sm text-ink-soft text-right leading-relaxed">
              Scan to vote<br />
              <span className="text-ink-faint tracking-normal normal-case">{voteUrl}</span>
            </p>
            <div className="border border-ink p-1.5 bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Scan to vote" width={62} height={62} />
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
