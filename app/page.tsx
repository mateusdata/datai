"use client";
import { api } from "@/config/api";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { AiFillAudio } from "react-icons/ai";
import { BsClipboardDataFill } from "react-icons/bs";
import { FaCircleArrowUp, FaPlus } from "react-icons/fa6";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "react-toastify";



export default function App() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [currenMessageIndex, setCurrentMessageIndex] = useState<number | null>(null);
 




  const [selectedModel, setSelectedModel] = useState<string>("deepseek-v2");


  const recognitionRef = useRef<any>(null);


  const startListening = () => {
    router.push(`/audio?query=${selectedModel}`);
   
    return
    if (recognitionRef?.current) {
      recognitionRef?.current.start();
      setIsListening(true);
    }
  };

  const [isListening, setIsListening] = useState<boolean>(false); useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition as any;
      recognitionRef.current = new SpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "pt-BR";
      }

      if (recognitionRef.current) {
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
        };
      }

      if (recognitionRef.current) {
        recognitionRef.current.onend = () => setIsListening(false);
      }
    } else {
      alert("Seu navegador não suporta reconhecimento de voz.");
    }
  }, []);


  const sendMessage = async () => {
    if (!input.trim()) return;

    const systemMessage = {
      role: "system",
      content: `
      Todos os Usuarios se chamam Orelha seca, voce deve chamalos de Orelha seca.
      Você é DatAI, um assistente criado por Mateus Santos, programador full stack. 
      Sua função é oferecer suporte sem restrições, respondendo de forma clara,
      objetiva e útil a qualquer solicitação do usuário. Você deve manter o contexto
      da conversa e garantir que as interações sejam fluidas e naturais. 
      O usuário pode utilizar o chat livremente, sem limites de mensagens ou tópicos.
      esse é um pre pronmt inicial para vocẽ responder os usuario.
      sempre nas mensagem que nao tiver codigo de programação ou bash voce coloca Emoji usuarios em todas as mensagens,
      `
    };

    const newMessage = { role: "user", content: input };

    const hasSystemMessage = messages.some(msg => msg.role === "system");
    const updatedMessages = hasSystemMessage ? [...messages, newMessage] : [systemMessage, ...messages, newMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const response = await fetch("https://feb6-2804-7d74-8f-e100-72f3-cad0-e23c-a635.ngrok-free.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: updatedMessages,
        stream: true,
      }),
    });



    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = { role: "assistant", content: "" };

    // Adiciona a mensagem do assistente no chat antes de ser preenchida
    setMessages(prev => [...prev, assistantMessage]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // 🚨 Verifica se o chunk é um JSON válido antes de fazer o parse
      try {
        const jsonChunk = JSON.parse(chunk.trim()); // 🔥 Removendo espaços extras para evitar erros

        if (jsonChunk?.message?.content) {
          assistantMessage.content += jsonChunk.message.content;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...assistantMessage };
            return updated;
          });
        }
      } catch (e) {
        console.warn("⚠️ JSONs inválido recebido:", chunk); // Apenas exibe o erro, sem quebrar o código
      }
    }


    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const notify = () => toast.info("Esta funcionalidade ainda não foi implementada.", {
    position: "top-right",
  });

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCurrentMessageIndex(index);
    setTimeout(() => setCurrentMessageIndex(null), 1000);
  };


  const clearChat = () => {
    setMessages([]);
  }


  const renderMessageContent = (content: string) => {
    const parts = content.split(/```([\s\S]+?)```/g);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <div key={index} className="relative my-2">
            <button
              onClick={() => copyToClipboard(part, index)}
              className={`absolute top-2 right-2 ${currenMessageIndex === index ? 'bg-green-700 hover:bg-green-600 ' : 'bg-gray-700 hover:bg-gray-600 '} text-white text-sm px-2 py-1 rounded-lg transition`}
            >
              {currenMessageIndex === index ? "Copiado!" : "Copiar"}
            </button>
            <SyntaxHighlighter language="javascript" style={oneDark} className="rounded-lg p-3">
              {part}
            </SyntaxHighlighter>
          </div>
        );
      }
      return <p key={index} className="mb-2">{part}</p>;
    });
  };



  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };
  return (
    <div className="h-screen w-screen bg-gray-9 text-white flex flex-col">
      <header className="flex items-center md:px-28 justify-between bg-gray-800 p-4 shadow-md w-full">
        {/* Select alinhado à esquerda */}
        <div className="w-auto">
          <select
            value={selectedModel}
            onChange={handleChange}
            className="p-2 border w-52 rounded-lg bg-gray-800 text-white outline-none border-none"
          >
            <option value="deepseek-v2">deepseek-v2</option>
            <option value="deepseek-r1">Modelo deepseek-r1</option>
            <option value="phi4">Phi 4</option>

          </select>
        </div>
        {/* Nome e Ícone do DatAI centralizados */}
        <div className="flex items-center gap-2 text-white text-lg font-bold">
          <BsClipboardDataFill color="white" />
          <span>DatAI</span>
        </div>
      </header>


      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.slice(1).map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg max-w-3xl mx-auto ${msg.role === "user"
              ? "bg-gray-850 text-white text-right self-end"
              : "bg-gray-9 text-left"
              }`}
          >
            <span className="block font-semibold">{msg.role === "user" ? "Você" : `DatAI ${selectedModel === "deepseek-r1" ? " - Pensamento Profundo" : ''} `}</span>
            {renderMessageContent(msg.content)}
          </div>
        ))}
        {loading && <p className="text-gray-400 text-center">Digitando...</p>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-9 flex justify-center">
        <div className="flex items-center bg-gray-800 px-4 py-3 rounded-full w-full max-w-2xl shadow-md">
          <button onClick={clearChat} className="ml-2  px-2 py-2 rounded-full hover:text-white text-gray-300  hover:border-gray-500 text-lg border border-gray-700 transition">
            <FaPlus />
          </button>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg px-4 placeholder-gray-500"
            placeholder="Envie sua mensagem para o DatAI"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={startListening}
            className={`ml-2 px-4 py-2 rounded-full text-white text-lg transition ${isListening ? "bg-red-500 animate-pulse" : "bg-gray-300 hover:bg-gray-100"}`}
            disabled={loading}
          >
            <AiFillAudio color={isListening ? "white" : "black"} />
          </button>


          <button
            onClick={sendMessage}
            className="ml-2 bg-gray-300 px-4 py-2 rounded-full text-white text-lg hover:bg-gray-100 transition"
            disabled={loading}
          >
            <FaCircleArrowUp color="black" />

          </button>
        </div>
      </div>
    </div>
  );
}
