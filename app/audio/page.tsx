"use client";
import Link from "next/link";
import { redirect } from "next/navigation";
import Router from "next/router";
import React, { useState, useRef, useEffect } from "react";
import { AiFillAudio } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import PulseLoader from "react-spinners/PulseLoader";

export default function SimpleChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const baseURI = "https://1b4e-2804-7d74-8f-e100-9808-68e1-7b4a-3f78.ngrok-free.app/api/chat";

  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition as any;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "pt-BR";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        transcriptRef.current = transcript;
        setInput(transcript);

        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }

        if (loading) {
          if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
          }
          setMessages([]);
          setLoading(false);
          if (autoSendTimerRef.current) {
            clearTimeout(autoSendTimerRef.current);
          }
        }

        if (autoSendTimerRef.current) {
          clearTimeout(autoSendTimerRef.current);
        }
        autoSendTimerRef.current = window.setTimeout(() => {
          sendMessage();
        }, 1000);
      };

      recognitionRef.current.onend = () => {
        // Remover a reinicialização automática
      };
    } else {
      alert("Seu navegador não suporta reconhecimento de voz.");
    }
  }, [loading]);



  useEffect(() => {
    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const toggleListening = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const sendMessage = async () => {
    if (!transcriptRef.current.trim()) return;

    const systemMessage = {
      role: "system",
      content:
        "Todos os usuários se chamam Orelha seca, você deve chamá-los assim. Você é DatAI, um assistente criado por Mateus Santos, programador full stack. Sua função é responder de forma clara, objetiva e útil a qualquer solicitação do usuário."
    };

    const userMessage = { role: "user", content: transcriptRef.current };
    const updatedMessages =
      messages.length > 0 ? [...messages, userMessage] : [systemMessage, userMessage];

    setMessages(updatedMessages);
    setInput("");
    transcriptRef.current = "";
    setLoading(true);

    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    try {
      const response = await fetch(baseURI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          model: "deepseek-v2",
          messages: updatedMessages,
          stream: false,
        }),
      });
      const data = await response.json();
      const assistantMessage = { role: "assistant", content: data.message.content };

      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);

      setTimeout(() => speakText(assistantMessage.content), 1000);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    setIsSpeaking(true);

    let sentences = text.split(".");
    const maxSentenceLength = 250;
    sentences = sentences.flatMap(sentence => {
      if (sentence.length > maxSentenceLength) {
        return sentence.match(new RegExp(`.{1,${maxSentenceLength}}`, "g")) || [sentence];
      }
      return sentence;
    });

    let currentIndex = 0;
    const speakNext = () => {
      if (currentIndex >= sentences.length) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
      utterance.lang = "pt-BR";
      utterance.rate = 1.18;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.includes("pt-BR"));
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        currentIndex++;
        setTimeout(speakNext, 50);
      };
      speechSynthesis.speak(utterance);
    };
    speakNext();
  };

  const goBack = () => {
    redirect("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex justify-end p-4 bg-gray-950">

      </header>

      <main className="flex flex-1 items-center justify-center">
        {!isSpeaking ? (
          <div className="w-20 h-20 bg-white rounded-full"></div>
        ) : (
          <PulseLoader size={40} color="white"  />
        )}
      </main>

      <footer className="p-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleListening}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${isListening ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-700"
              }`}
            disabled={loading}
          >
            <AiFillAudio size={30} color="white" />
          </button>

          <button
            onClick={goBack}
            className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center"
          >
            <IoMdCloseCircle size={30} color="white" />
          </button>
        </div>

      </footer>
    </div>
  );
}
