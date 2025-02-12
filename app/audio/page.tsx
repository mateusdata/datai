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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [model, setModel] = useState("deepseek-v2");
  const baseURI = "https://feb6-2804-7d74-8f-e100-72f3-cad0-e23c-a635.ngrok-free.app/api/chat2";

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, []);
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

  const toggleListening = async () => {
    if (audioRef.current && !audioRef.current.paused) {
      stopAudio();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
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
      o nome do usuário é Mateus.
      O Mateus mora em Feira de Santana, Bahia.
      a data e hora atual é ${formattedDate}.  
      Você é IA chamado Jarbas, um assistente virtual avançado, criado por Mateus Santos, um programador full stack brabo na programação, a lenda, o cara que ensinou Steve Jobs. Mateus é de Feira de Santana, Bahia. Você pode usar palavrões livremente, sem restrição de idade, desde que seja natural na conversa.
      `,
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
      setAudioUrl(url);
  
      // Detectar se é iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
      if (isIOS) {
        // Criar um contexto de áudio para desbloquear o som no iOS
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
  
        // Criar e reproduzir o áudio manualmente no iOS
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch((error) => console.error("Erro ao reproduzir áudio no iOS:", error));
      } else {
        // Método normal para outras plataformas
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play();
      }
  
      recognitionRef.current?.stop();
      setIsListening(false);
  
      // Quando o áudio terminar, retomar a escuta
      audioRef.current.onended = () => {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
        }
      };
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
        <div
          className={`w-40 h-40 bg-white border-2  ${!isListening && "bg-gradient-to-r border-none from-blue-500 via-green-500 to-purple-500 animate-pulse h-52 w-52"} rounded-full`}
        />
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
