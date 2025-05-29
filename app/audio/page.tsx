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
        Não retorne emogins nem carateres espediais como * ** *** ou && ### 
        não retorne nada que não seja texto puro,
        não retone em formato de markdown.
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
      <header className="flex justify-between items-center p-4 bg-gray-950 border-b border-gray-800">
        <span>Modelo: Gemini Flash</span>
        <div className="flex items-center space-x-2">
            {isListening && <PulseLoader size={6} color="lightgreen" speedMultiplier={0.7} />}
            <span className={`text-sm ${isListening ? "text-green-400" : "text-gray-400"}`}>
            {isListening ? "Ouvindo..." : (loading ? "Processando..." : "Aguardando")}
            </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center space-y-6 p-4 overflow-y-auto">
        {/* Example of how messages could be displayed */}
        {/* <div className="w-full max-w-2xl space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : (msg.role === 'assistant' ? 'bg-gray-700 mr-auto' : 'bg-yellow-600 text-black text-xs text-center mx-auto')}`}>
              <p className="text-sm font-semibold">{msg.role === 'user' ? 'Você' : (msg.role === 'assistant' ? 'Jarbas' : 'Sistema')}</p>
              <p>{msg.content}</p>
            </div>
          ))}
        </div> */}

        <div
          className={`rounded-full transition-all duration-300 ease-in-out flex items-center justify-center
            ${isListening
              ? "w-40 h-40 bg-green-500 shadow-xl border-4 border-green-300"
              : (loading ? "w-48 h-48 bg-gray-700" : "w-52 h-52 bg-gradient-to-br animate-pulse from-blue-600 via-purple-600 to-pink-600")}
            ${loading ? "animate-none" : (isListening ? "" : "hover:opacity-90")}
          `}
        >
          {loading && <PulseLoader size={30} color="white" />}
          {!loading && !isListening && (
            <AiFillAudio size={80} color="rgba(255,255,255,0.8)" className="opacity-50" />
          )}
           {isListening && (
             <div className="text-center">
                <AiFillAudio size={50} color="white" />
                <p className="text-xs mt-2 text-white"></p>
             </div>
           )}
        </div>
      </main>

      <footer className="p-4 flex justify-center items-center space-x-4 bg-gray-950 border-t border-gray-800">
        <button
          onClick={toggleListening}
          disabled={loading} // Disable button when loading to prevent multiple requests
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-500 hover:bg-blue-600"
            }
            disabled:bg-gray-500 disabled:cursor-not-allowed
          `}
          aria-label={isListening ? "Parar de ouvir" : "Começar a ouvir"}
        >
          <AiFillAudio size={30} color="white" />
        </button>
        {/* Removed explicit stopAudio button as toggleListening and audio ending handle this */}
        {/* You can add it back if you need an explicit manual stop for audio that doesn't affect listening state */}
        <button
          onClick={goBack}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          aria-label="Voltar"
        >
          <IoMdCloseCircle size={30} color="white" />
        </button>
      </footer>
    </div>
)

}
