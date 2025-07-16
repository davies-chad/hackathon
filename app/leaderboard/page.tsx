"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; percent: number }[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const lb = JSON.parse(localStorage.getItem("leaderboard") || "[]");
        setLeaderboard(lb);
      } catch {}
    }
  }, []);

  return (
    <div className="max-w-xl mx-auto mt-32 p-8 bg-white rounded shadow text-center">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">Leaderboard</h1>
      <ol className="text-left space-y-4 max-w-md mx-auto mb-8">
        {leaderboard.length === 0 && <li className="text-gray-500">No scores yet.</li>}
        {leaderboard.map((entry, idx) => (
          <li key={idx} className="flex justify-between items-center bg-blue-50 rounded px-4 py-3 font-bold text-gray-900 shadow-sm">
            <span>{idx + 1}. {entry.name}</span>
            <span>{entry.score} / 15 ({entry.percent}%)</span>
          </li>
        ))}
      </ol>
      <button
        className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-semibold"
        onClick={() => router.push("/")}
      >
        Back to Start
      </button>
    </div>
  );
} 