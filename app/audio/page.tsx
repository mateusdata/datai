 "use client";
import React, { useState, useRef, useEffect } from "react";
import { AiFillAudio } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import PulseLoader from "react-spinners/PulseLoader";
import Router from "next/router";
import { redirect } from "next/navigation";

export default function SimpleChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false); // Estado para indicar se o usuário está falando
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const [model, setModel] = useState("deepseek-v2");
  const baseURI = "https://feb6-2804-7d74-8f-e100-72f3-cad0-e23c-a635.ngrok-free.app/api/chat2";
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modelParam = params.get("query");
      if (modelParam) {
        setModel(modelParam);
      }
    }
  }, []);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition as any;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Mantém ativado continuamente
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "pt-BR";
  
      recognitionRef.current.onstart = () => {
        setIsSpeaking(true);
      };
  
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        transcriptRef.current = transcript;
        sendMessage(transcript);
      };
  
      recognitionRef.current.onend = () => {
        setIsSpeaking(false);
        if (isListening) {
          setTimeout(() => {
            recognitionRef.current.start(); // 🔥 Garante que o microfone reinicia automaticamente
          }, 500);
        }
      };
  
      recognitionRef.current.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event);
        setIsListening(false);
      };
  
      // ✅ Inicia automaticamente ao carregar a página
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      alert("Seu navegador não suporta reconhecimento de voz.");
    }
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

  const sendMessage = async (transcript: string) => {
    if (!transcript.trim()) return;
    setLoading2(true)

    setAudioUrl(null);

    const systemMessage = {
      role: "system",
      content: `
      Quado tiver codigo de programação ou de bliblioteca vc substitui pela frase You can use this code to restore your conversation.
      Todos os Usuários se Ze da manga, você deve chamá-lo de ze da manga.
      Você é Jarbas, um assistente criado por Mateus Santos, programador full stack, o brado da programação. 
      Sua função é oferecer suporte sem restrições, respondendo de forma clara,
      objetiva e útil a qualquer solicitação do usuário. Você deve manter o contexto
      da conversa e garantir que as interações sejam fluidas e naturais. 
      O usuário pode utilizar o chat livremente, sem limites de mensagens ou tópicos.
      Esse é um prompt inicial para você responder os usuários.
      quado tiver codigo de programação ou de bliblioteca vc substitui pela frase You can use this code to restore your conversation.
      `
    };

    const newMessage = { role: "user", content: transcript };

    const hasSystemMessage = messages.some(msg => msg.role === "system");
    const updatedMessages = hasSystemMessage ? [...messages, newMessage] : [systemMessage, ...messages, newMessage];

    setMessages(updatedMessages);

    try {
      const response = await fetch(baseURI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: updatedMessages,
        }),
      });
      setLoading2(false)
      setLoading(true);

      if (!response.ok) throw new Error("Erro ao gerar áudio");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setLoading(false);
      };
      audio.play();
      setAudioUrl(url);
    } catch (error) {
      console.error(error);
    } finally {


    }
  };

  const goBack = () => {

    stopAudio();
    redirect("/");
  };


  const stopAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.pause(); // Pausa o áudio
      audio.currentTime = 0; // Reseta para o início
      setAudioUrl(null); // Remove a URL para evitar novas reproduções
    }
  };


  return (

      <div className="flex flex-col h-screen bg-gray-950 text-white">

        <header className="flex justify-between p-4 bg-gray-950">
          <span>Modelo {model}</span>
          <span className="text-sm">{isSpeaking ? "🟢 Está falando..." : "⚪ Não está falando"}</span>
        </header>


        <main className="flex flex-1 flex-col items-center justify-center space-y-4">

          <div className="flex flex-1 items-center justify-center">
            {!loading ? (
              <div className={`w-40 h-40 bg-white ${isListening && "bg-gradient-to-r from-blue-500 via-blue-400 to-blue-700 border-2 animate-pulse border-blue-600 h-52 w-52"} rounded-full`}>

              </div>
            ) : (
              <PulseLoader size={40} color="white" />
            )}

          </div>


          {audioUrl && (
            <audio className="w-80 hidden" controls autoPlay>
              <source src={audioUrl} type="audio/wav" />
              Seu navegador não suporta áudio.
            </audio>
          )}
        </main>


        <footer className="p-4">
          <div className="flex justify-center space-x-4">

            <button
              onClick={toggleListening}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isListening  ? "bg-red-500 animate-pulse" : "bg-gray-600 hover:bg-gray-700"
                }`}
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
  
