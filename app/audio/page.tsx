// app/chat/page.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { AiFillAudio } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import PulseLoader from "react-spinners/PulseLoader";
import { redirect } from "next/navigation";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition:any = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = "pt-BR";

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        sendMessage(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (audioRef.current && !audioRef.current.paused) {
      stopAudio();
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUrl(null);
    }
  };

  const sendMessage = async (transcript: string) => {
    if (!transcript.trim()) return;

    setLoading(true);
    stopAudio();

    const today = new Date();
    const formattedDate = today.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemMessage = {
      role: "system",
      content: `
        O nome do usuário é Mateus. Ele mora em Feira de Santana, Bahia.
        A data e hora atual é ${formattedDate}.
        Você é Jarbas, um assistente virtual criado por Mateus Santos. Seja direto, fale como gente, sem filtro.
      `,
    };

    const newMessage = { role: "user", content: transcript };
    const updatedMessages = messages.some((msg) => msg.role === "system")
      ? [...messages, newMessage]
      : [systemMessage, newMessage];

    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/chat2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-2.0-flash", messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Erro ao gerar áudio");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setAudioUrl(url);
      audio.play();

      recognitionRef.current?.stop();
      setIsListening(false);

      audio.onended = () => {
        recognitionRef.current?.start();
        setIsListening(true);
      };
    } catch (error) {
      console.error("Erro ao gerar resposta:", error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    stopAudio();
    redirect("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex justify-between items-center p-4 bg-gray-950">
        <span>Modelo: Gemini</span>
        <span className="text-sm">{isListening ? "🟢 Está falando..." : "⚪ Não está falando"}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div
          className={`rounded-full transition-all duration-300 ${
            isListening
              ? "w-40 h-40 bg-white border-2"
              : "w-52 h-52 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-pulse"
          }`}
        />
        {loading && <PulseLoader size={40} color="white" />}
      </main>

      <footer className="p-4 flex justify-center space-x-4">
        <button
          onClick={toggleListening}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isListening ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          <AiFillAudio size={30} color="white" />
        </button>
        <button onClick={stopAudio} className="px-4 py-2 text-sm bg-gray-700 rounded-lg">
          stopAudio
        </button>
        <button
          onClick={goBack}
          className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center"
        >
          <IoMdCloseCircle size={30} color="white" />
        </button>
      </footer>
    </div>
  );
}
