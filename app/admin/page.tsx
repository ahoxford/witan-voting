"use client";

import { useState, useEffect } from "react";
import AdminRoomCard from "@/components/AdminRoomCard";
import CreateRoomForm from "@/components/CreateRoomForm";
import type { Room } from "@/lib/types";

export default function AdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink">
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-6 flex items-end justify-between gap-6">
          <div>
            <p className="label-caps-sm text-ink-faint mb-3">Oxford-Style Debate</p>
            <h1 className="display text-4xl font-semibold leading-tight">Chair&apos;s Table</h1>
            <p className="text-sm text-ink-soft mt-2">
              Convene divisions and call the House to vote.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 label-caps bg-ink text-paper px-5 py-3 hover:bg-ink-deep transition-colors"
          >
            Convene Debate
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {showForm && (
          <CreateRoomForm
            onCreated={(room) => {
              setRooms((prev) => [room, ...prev]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-px h-10 bg-ink breathe" />
            <p className="label-caps text-ink-soft">Retrieving the order paper</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 border-t border-rule">
            <p className="display text-2xl text-ink-mid">No debates on the order paper</p>
            <p className="text-sm text-ink-soft mt-2">
              Convene a debate to open the first division.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {rooms.map((room) => (
              <AdminRoomCard key={room.id} room={room} onUpdate={fetchRooms} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
