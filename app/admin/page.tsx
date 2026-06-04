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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Debate Voting Admin</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage live debate rooms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + New Room
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
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
          <div className="text-gray-400 text-center py-16">Loading rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No debate rooms yet.</p>
            <p className="text-sm mt-1">Click &ldquo;New Room&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <AdminRoomCard key={room.id} room={room} onUpdate={fetchRooms} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
