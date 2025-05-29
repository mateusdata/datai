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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#181824] to-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-600/20 via-transparent to-transparent"></div>
      
      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-gray-800 rounded-full animate-ping opacity-20"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-gray-700 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce opacity-25"></div>
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-gray-600 rounded-full animate-ping opacity-20"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Model Gemini Flash 
                </h1>
                <p className="text-xs text-gray-400">Conversação por Voz</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {(isListening || loading) && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md">
                  <PulseLoader 
                    size={4} 
                    color={isListening ? "#10b981" : "#3b82f6"} 
                    speedMultiplier={0.8} 
                  />
                  <span className={`text-xs font-medium ${
                    isListening ? "text-emerald-400" : 
                    loading ? "text-blue-400" : "text-gray-400"
                  }`}>
                    {isListening ? "Escutando" : loading ? "Processando" : "Aguardando"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {/* Central Voice Interface */}
          <div className="relative">
            {/* Outer Glow Ring */}
            <div className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
              isListening 
                ? "animate-ping bg-emerald-500/30 scale-150" 
                : loading 
                ? "animate-pulse bg-blue-500/20 scale-125"
                : "bg-purple-500/10 scale-110"
            }`}></div>
            
            {/* Middle Ring */}
            <div className={`absolute inset-2 rounded-full backdrop-blur-sm transition-all duration-500 ${
              isListening 
                ? "bg-emerald-500/20 animate-pulse border-2 border-emerald-400/50" 
                : loading 
                ? "bg-blue-500/20 border-2 border-blue-400/50"
                : "bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-white/20"
            }`}></div>
            
            {/* Main Button */}
            <div
              onClick={toggleListening}
              className={`relative w-48 h-48 rounded-full cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
              isListening
                ? "bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl shadow-white/10"
                : loading
                ? "bg-gradient-to-br from-gray-700 to-gray-800 shadow-2xl shadow-white/10"
                : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 shadow-2xl shadow-white/10 hover:shadow-white/20"
              } flex items-center justify-center border border-white/20`}
            >
              {loading ? (
                <div className="flex flex-col items-center space-y-3">
                  <PulseLoader size={20} color="white" />
                  <span className="text-sm font-medium text-white/80">Processando</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <AiFillAudio 
                    size={isListening ? 60 : 80} 
                    color="white" 
                    className={`${isListening ? "animate-pulse" : ""} drop-shadow-lg`}
                  />
                  <span className="text-sm font-medium text-white/90">
                    {isListening ? "Ouvindo..." : "Toque para falar"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Card */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 max-w-md w-full">
            <div className="text-center">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                isListening 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : loading 
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isListening ? "bg-emerald-400 animate-pulse" : 
                  loading ? "bg-blue-400 animate-spin" : "bg-purple-400"
                }`}></div>
                <span>
                  {isListening ? "🎤 Pode falar agora" : 
                   loading ? "⚡ Gerando resposta" : "💫 Pronto para conversar"}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                {isListening ? "Sua voz está sendo captada em tempo real" : 
                 loading ? "Processando sua mensagem com IA" : "Toque no botão central para iniciar"}
              </p>
            </div>
          </div>

          {/* Wave Animation when listening */}
          {isListening && (
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-emerald-400 rounded-full animate-bounce`}
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                ></div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="backdrop-blur-xl bg-black/20 border-t border-white/10 p-6">
          <div className="flex justify-center items-center space-x-4">
            <button
              onClick={toggleListening}
              disabled={loading}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-md ${
                isListening
                  ? "bg-red-500/90 hover:bg-red-600 border border-red-400/50"
                  : "bg-emerald-500/90 hover:bg-emerald-600 border border-emerald-400/50"
              } disabled:bg-gray-500/50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
              aria-label={isListening ? "Parar de ouvir" : "Começar a ouvir"}
            >
              <AiFillAudio size={24} color="white" />
            </button>

            <button
              onClick={goBack}
              className="w-12 h-12 bg-gray-700/80 hover:bg-gray-600 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-gray-600/50 hover:scale-105 active:scale-95 shadow-lg"
              aria-label="Voltar"
            >
              <IoMdCloseCircle size={24} color="white" />
            </button>
          </div>
          
            <div className="text-center mt-4 flex flex-col items-center">
            <p className="text-xs text-gray-500">
              Desenvolvido por mateusdata
            </p>
            <a
              href="https://github.com/mateusdata"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              fill="currentColor"
              viewBox="0 0 24 24"
              className="mr-1"
              >
              <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.813 1.102.813 2.222 0 1.606-.014 2.898-.014 3.293 0 .321.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            </div>
        </footer>
      </div>
    </div>
  );

}
