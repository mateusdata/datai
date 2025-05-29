"use client";
import { api } from "@/config/api";
import { useState } from "react";

export default function SimpleChat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setAudioUrl(null);

    try {
      const response = await fetch("/api/chat2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-v2",
          messages: [{ role: "user", content: input }],
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar áudio");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-xl font-bold mb-4">Chat com Áudio</h1>

      <input
        className="w-full max-w-md p-2 rounded bg-gray-800 text-white border border-gray-700"
        placeholder="Digite uma mensagem..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={sendMessage}
        className="mt-4 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition disabled:bg-gray-700"
        disabled={loading}
      >
        {loading ? "Gerando Áudio..." : "Enviar"}
      </button>

      {audioUrl && (
        <audio className="mt-4 w-80 hidden" controls autoPlay>
          <source src={audioUrl} type="audio/wav" />
          Seu navegador não suporta áudio.
        </audio>
      )}
    </div>
  );
}
