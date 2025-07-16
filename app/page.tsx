"use client";
import { useState, useEffect, useRef } from "react";

interface Question {
  question: string;
  choices: string[];
  answer: number;
  sport: string;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export default function Home() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showerEmojis, setShowerEmojis] = useState<string[]>([]);
  const [showerKey, setShowerKey] = useState(0);
  const showerTimeout = useRef<NodeJS.Timeout | null>(null);
  const [userName, setUserName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; percent: number }[]>([]);

  // Load leaderboard from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const lb = JSON.parse(localStorage.getItem("leaderboard") || "[]");
        setLeaderboard(lb);
      } catch {}
    }
  }, []);

  // On quiz completion, update leaderboard
  useEffect(() => {
    if (showResults && nameEntered) {
      const percent = Math.round((score / selectedQuestions.length) * 100);
      const entry = { name: userName, score, percent };
      let lb = [];
      if (typeof window !== "undefined") {
        try {
          lb = JSON.parse(localStorage.getItem("leaderboard") || "[]");
        } catch {}
      }
      lb.push(entry);
      lb.sort((a: { name: string; score: number; percent: number }, b: { name: string; score: number; percent: number }) => b.score - a.score || b.percent - a.percent);
      lb = lb.slice(0, 5);
      setLeaderboard(lb);
      if (typeof window !== "undefined") {
        localStorage.setItem("leaderboard", JSON.stringify(lb));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  // Quiz generation logic
  function generateQuiz(data: Question[], lastQuestions: string[] = []) {
    // Exclude last quiz questions
    const filtered = data.filter(q => !lastQuestions.includes(q.question));
    const bySport: Record<string, Question[]> = { NFL: [], MLB: [], NBA: [], Tennis: [] };
    filtered.forEach(q => { if (bySport[q.sport]) bySport[q.sport].push(q); });
    // Improved randomization: pick 3 or 4 from each sport, total 15
    let picked: Question[] = [];
    const perSport: Record<string, number> = { NFL: 3, MLB: 3, NBA: 3, Tennis: 3 };
    const sports = ["NFL", "MLB", "NBA", "Tennis"];
    shuffle(sports);
    for (let i = 0; i < 3; i++) perSport[sports[i]]++;
    sports.forEach(sport => {
      // If not enough unique, fallback to full pool for that sport
      const pool = bySport[sport].length >= perSport[sport] ? bySport[sport] : data.filter(q => q.sport === sport);
      picked = picked.concat(pickRandom(pool, perSport[sport]));
    });
    picked = shuffle(picked);
    // Shuffle choices for each question and update answer index
    picked = picked.map(q => {
      const choicesWithIndex = q.choices.map((choice, idx) => ({ choice, idx }));
      const shuffled = shuffle(choicesWithIndex);
      const newChoices = shuffled.map(c => c.choice);
      const newAnswer = shuffled.findIndex(c => c.idx === q.answer);
      return { ...q, choices: newChoices, answer: newAnswer };
    });
    return picked;
  }

  // On mount, load questions and generate quiz
  useEffect(() => {
    fetch("/questions.json")
      .then((res) => res.json())
      .then((data: Question[]) => {
        setAllQuestions(data);
        let lastQuestions: string[] = [];
        if (typeof window !== "undefined") {
          try {
            lastQuestions = JSON.parse(localStorage.getItem("lastQuizQuestions") || "[]");
          } catch {}
        }
        const picked = generateQuiz(data, lastQuestions);
        setSelectedQuestions(picked);
        setAnswers(Array(picked.length).fill(null));
        setLocked(Array(picked.length).fill(false));
        setLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("lastQuizQuestions", JSON.stringify(picked.map(q => q.question)));
        }
      });
  }, []);

  // On restart, generate a new quiz
  function restartQuiz() {
    if (!allQuestions.length) return;
    let lastQuestions: string[] = [];
    if (typeof window !== "undefined") {
      try {
        lastQuestions = JSON.parse(localStorage.getItem("lastQuizQuestions") || "[]");
      } catch {}
    }
    const picked = generateQuiz(allQuestions, lastQuestions);
    setSelectedQuestions(picked);
    setAnswers(Array(picked.length).fill(null));
    setLocked(Array(picked.length).fill(false));
    setCurrent(0);
    setShowResults(false);
    setNameEntered(false); // Reset name entry for new quiz
    if (typeof window !== "undefined") {
      localStorage.setItem("lastQuizQuestions", JSON.stringify(picked.map(q => q.question)));
    }
  }

  const handleSelect = (aIdx: number) => {
    if (locked[current]) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = aIdx;
      return next;
    });
    setLocked((prev) => {
      const next = [...prev];
      next[current] = true;
      return next;
    });
    // Shower effect
    const isCorrect = selectedQuestions[current]?.answer === aIdx;
    const emojis = isCorrect ? ["💯", "💸", "💯", "💸", "💯", "💸", "💯", "💸", "💯", "💸"] : ["💩", "💩", "💩", "💩", "💩", "💩", "💩", "💩", "💩", "💩"];
    setShowerEmojis(emojis);
    setShowerKey((k) => k + 1);
    if (showerTimeout.current) clearTimeout(showerTimeout.current);
    showerTimeout.current = setTimeout(() => setShowerEmojis([]), 1800);
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const handlePrev = () => setCurrent((c) => Math.max(0, c - 1));
  const handleNext = () => setCurrent((c) => Math.min(selectedQuestions.length - 1, c + 1));

  const score = answers.filter((a, i) => a === selectedQuestions[i]?.answer).length;

  if (loading) {
    return <div className="max-w-xl mx-auto mt-16 p-6 bg-white rounded shadow text-center">Loading questions...</div>;
  }

  // Name input screen
  if (!nameEntered) {
    return (
      <div className="max-w-xl mx-auto mt-32 p-8 bg-white rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-6 text-blue-900">Welcome to Sports Trivia!</h1>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (userName.trim()) setNameEntered(true);
          }}
        >
          <input
            className="border border-gray-400 rounded px-4 py-2 text-lg mb-4 w-full max-w-xs font-bold text-gray-900 placeholder:font-bold placeholder:text-gray-500"
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            maxLength={32}
            required
          />
          <br />
          <button
            type="submit"
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-semibold"
            disabled={!userName.trim()}
          >
            Start Quiz
          </button>
        </form>
        <button
          className="mt-6 px-6 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-lg font-bold border border-blue-300"
          onClick={() => window.location.href = '/leaderboard'}
        >
          View Leaderboard
        </button>
      </div>
    );
  }

  if (showResults) {
    const percent = Math.round((score / selectedQuestions.length) * 100);
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-white rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-4 text-blue-900">Quiz Complete!</h1>
        <div className="mb-4 text-lg font-bold text-gray-900 bg-blue-50 rounded p-2 shadow-sm inline-block">
          Your score: <span>{score} / {selectedQuestions.length}</span> <span className="ml-2 text-blue-700 font-semibold">({percent}%)</span>
        </div>
        <div className="mb-10"></div>
        <div className="mb-2 text-xl font-bold text-gray-900 bg-blue-50 rounded p-2 shadow-sm inline-block">Answers:</div>
        <ol className="text-left space-y-4">
          {selectedQuestions.map((q, i) => (
            <li key={i}>
              <div className="mb-1 text-sm text-gray-500">Q{i + 1} ({q.sport})</div>
              <div className="mb-1 text-base font-semibold text-gray-900 bg-blue-50 rounded p-2 shadow-sm">{q.question}</div>
              <span className="text-green-700">Correct: {q.choices[q.answer]}</span>
              <br />
              <span className={
                answers[i] === q.answer
                  ? "text-green-600"
                  : "text-red-600"
              }>
                Your answer: {answers[i] !== null ? q.choices[answers[i]!] : "No answer"}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-10 mb-2 text-xl font-bold text-gray-900 bg-blue-50 rounded p-2 shadow-sm inline-block">Leaderboard</div>
        <ol className="text-left space-y-2 max-w-md mx-auto mb-4">
          {leaderboard.length === 0 && <li className="text-gray-500">No scores yet.</li>}
          {leaderboard.map((entry, idx) => (
            <li key={idx} className="flex justify-between bg-gray-100 rounded px-3 py-2 font-semibold">
              <span>{idx + 1}. {entry.name}</span>
              <span>{entry.score} / 15 ({entry.percent}%)</span>
            </li>
          ))}
        </ol>
        <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={restartQuiz}>Restart Quiz</button>
      </div>
    );
  }

  const q = selectedQuestions[current];

  return (
    <div className="relative max-w-xl mx-auto mt-16 p-6 bg-white rounded shadow overflow-hidden">
      {/* Emoji Shower Overlay */}
      {showerEmojis.length > 0 && (
        <div key={showerKey} className="pointer-events-none absolute inset-0 z-20">
          {showerEmojis.map((emoji, i) => (
            <span
              key={i}
              className="emoji-shower absolute text-5xl animate-emoji-shower"
              style={{
                left: `${10 + i * 8}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
      {/* Quiz Content */}
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-900">Sports Trivia Quiz</h1>
      <div className="mb-2 text-sm text-gray-500 text-center">Question {current + 1} of {selectedQuestions.length} ({q.sport})</div>
      <div className="mb-6 text-lg font-semibold text-center text-gray-900 bg-blue-50 rounded p-4 shadow-sm">{q.question}</div>
      <div className="flex flex-col gap-3">
        {q.choices.map((choice, aIdx) => {
          let btnClass = "px-4 py-2 rounded border border-gray-400 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ";
          if (locked[current]) {
            if (aIdx === q.answer) {
              btnClass += "bg-green-600 text-white";
            } else if (answers[current] === aIdx) {
              btnClass += "bg-red-600 text-white";
            } else {
              btnClass += "bg-white text-gray-900";
            }
          } else {
            btnClass += answers[current] === aIdx ? "bg-blue-700 text-white" : "bg-white text-gray-900 hover:bg-blue-100";
          }
          return (
            <button
              key={aIdx}
              className={btnClass}
              onClick={() => handleSelect(aIdx)}
              disabled={locked[current]}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {/* Remove static emoji feedback, shower replaces it */}
      <div className="mt-8 flex justify-between">
        <button
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
          onClick={handlePrev}
          disabled={current === 0}
        >
          Previous
        </button>
        {current === selectedQuestions.length - 1 ? (
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={answers.some(a => a === null)}
          >
            Submit Quiz
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            onClick={handleNext}
            disabled={answers[current] === null}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
