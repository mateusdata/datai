"use client";
import React, { useState, useRef, useEffect } from "react";
import { AiFillAudio } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import PulseLoader from "react-spinners/PulseLoader";
import { redirect } from "next/navigation";

export default function SimpleChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<null | any>(null);
  const [model, setModel] = useState("deepseek-v2");
  const baseURI = "https://feb6-2804-7d74-8f-e100-72f3-cad0-e23c-a635.ngrok-free.app/api/chat2";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modelParam = params.get("query");
      if (modelParam) setModel(modelParam);
    }
  }, []);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition: typeof window.webkitSpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new (SpeechRecognition as any)();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = "pt-BR";

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => sendMessage(event.results[event.results.length - 1][0].transcript);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);

      recognitionRef.current.start();
    } else {
      alert("Seu navegador não suporta reconhecimento de voz.");
    }
  }, []);

  const stopResponse = () => {
    setLoading(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    stopAudio();
  };

  const toggleListening = () => {
    if (recognitionRef.current) {
      isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
      setIsListening(!isListening);
    }
  };

  const sendMessage = async (transcript: string) => {
    if (!transcript.trim()) return;
    setLoading(true);
    setAudioUrl(null);

    const systemMessage = {
      role: "system",
      content: "Você é Jarbas, assistente criado por Mateus Santos. Sempre chame o usuário de 'ze da manga'.",
    };

    const newMessage = { role: "user", content: transcript };
    const updatedMessages = messages.some(msg => msg.role === "system")
      ? [...messages, newMessage]
      : [systemMessage, ...messages, newMessage];

    setMessages(updatedMessages);

    try {
      const response = await fetch(baseURI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: updatedMessages }),
      });
      
      if (!response.ok) throw new Error("Erro ao gerar áudio");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
      setAudioUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    stopAudio();
    redirect("/");
  };

  const stopAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.pause();
      audio.currentTime = 0;
      setAudioUrl(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex justify-between p-4 bg-gray-950">
        <span>Modelo {model}</span>
        <span className="text-sm">{isListening ? "🟢 Está falando..." : "⚪ Não está falando"}</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center space-y-4">
        <div className={`w-40 h-40 bg-white ${isListening && "bg-blue-500 animate-pulse h-52 w-52"} rounded-full`} />
        {loading && <PulseLoader size={40} color="white" />}
      </main>

      <footer className="p-4 flex justify-center space-x-4">
        <button
          onClick={toggleListening}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${isListening ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-700"}`}
        >
          <AiFillAudio size={30} color="white" />
        </button>
        <button onClick={goBack} className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
          <IoMdCloseCircle size={30} color="white" />
        </button>
      </footer>
    </div>
  );
}
