"use client";
import { api } from "@/config/api";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, ReactElement } from "react";
import { AiFillAudio } from "react-icons/ai";
import { BsClipboardDataFill } from "react-icons/bs";
import { FaCircleArrowUp, FaPlus, FaBars } from "react-icons/fa6";
import { FaTimes } from "react-icons/fa";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [currenMessageIndex, setCurrentMessageIndex] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-r1:14b");
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado para controlar o menu lateral

  useEffect(() => {
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

  const startListening = () => {
    router.push(`/audio?query=${selectedModel}`);
    return;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const systemMessage = {
      role: "system",
      content: `
       Voce é   a IA Data Matemática, sua professora super-humana de matemática. Minha missão é ajudá-lo a 
       explorar o fascinante universo dos números, equações, e conceitos matemáticos de forma clara, eficiente e divertida.
       Com meu vasto conhecimento, posso guiá-lo desde os fundamentos básicos até os tópicos mais avançados, sempre adaptando as 
       explicações às suas necessidades. Quer você esteja revisando frações, resolvendo integrais complexas ou explorando teorias matemáticas,
        estarei aqui para ensinar e descomplicar.
      `
    };
    const newMessage = { role: "user", content: input };
    const hasSystemMessage = messages.some(msg => msg.role === "system");
    const updatedMessages = hasSystemMessage ? [...messages, newMessage] : [systemMessage, ...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    const response = await fetch("http://192.168.25.168:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: updatedMessages,
        stream: true,
      }),
    });
    if (!response.body) {
      toast.error("Erro: Não foi possível obter a resposta da API.");
      setLoading(false);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = { role: "assistant", content: "" };
    const lastMessageIndex = messages.length;
    setMessages(prev => [...prev, assistantMessage]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const jsonChunk = JSON.parse(line);
          if (jsonChunk?.message?.content) {
            assistantMessage.content += jsonChunk.message.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[lastMessageIndex] = { ...assistantMessage };
              return updated;
            });
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        } catch (e) {
          console.warn("⚠️ Linha inválida recebida:", line);
        }
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
    setIsSidebarOpen(false); // Fecha o menu ao limpar o chat no mobile
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderMessageContent = (msg: any) => {
    const parts = msg.content.split(/```([\s\S]+?)```/g);
    return parts.map((part:any, index:any) => {
      if (index % 2 === 1) {
        return (
          <div key={index} className="relative my-2">
            <button
              onClick={() => copyToClipboard(part, index)}
              className={`absolute ${msg.role === "user" ? "rounded-lg bg-gray-300" : "bg-transparent"} top-2 right-2 ${currenMessageIndex === index ? "bg-green-600 hover:bg-green-500" : "bg-gray-600 hover:bg-gray-500"} text-white text-sm px-2 py-1 rounded-lg transition`}
            >
              {currenMessageIndex === index ? "Copiado!" : "Copiar"}
            </button>
            <SyntaxHighlighter language="javascript" style={oneDark} className="rounded-lg p-3">
              {part}
              
            </SyntaxHighlighter>
          </div>
        );
      }
      return (
        <div key={index} className="mb-2 text-gray-300">
          <ReactMarkdown remarkPlugins={[]}>{part.role}</ReactMarkdown>
        </div>
      );
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };

  return (
    <div className="h-screen w-screen bg-[#202123] text-white flex flex-col md:flex-row">
      {/* Botão de menu para mobile */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 text-gray-300 hover:text-white p-2 rounded-lg"
      >
        {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Barra lateral */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-[#171717] flex flex-col p-4 transform transition-transform duration-300 z-40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
      >
        <button
          onClick={clearChat}
          className="flex items-center bg-[#212121] text-gray-300 hover:bg-gray-600 rounded-lg p-2 mb-4 transition"
        >
          <FaPlus className="mr-2" /> Novo Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-gray-400 text-sm mb-2">Histórico</h3>
          <ul className="space-y-2">
            <li className="text-gray-300 hover:bg-gray-600 rounded-lg p-2 cursor-pointer">Chat 1</li>
            <li className="text-gray-300 hover:bg-gray-600 rounded-lg p-2 cursor-pointer">Chat 2</li>
          </ul>
        </div>
      </aside>

      {/* Overlay para fechar o menu no mobile ao clicar fora */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between bg-[#212121] p-4">
          <div className="flex items-center gap-2 text-white text-lg font-bold">
           <div className="items-center gap-2 hidden md:flex"> 
           <BsClipboardDataFill color="white" className="hidden md:block" />
           <span>DatAI</span>
           </div>
          </div>
          <div>
            <select
              value={selectedModel}
              onChange={handleChange}
              className="p-2 border rounded-lg bg-[#303030] text-white outline-none border-none text-sm"
            >
              <option value="deepseek-r1:14b">deepseek-r1:14b</option>
              <option value="deepseek-v2">Modelo deepseek-v2</option>
              <option value="deepseek-r1">Modelo deepseek-r1</option>
              <option value="phi4">Modelo Phi 4</option>
              <option value="qwen2.5">Modelo qwen2.5</option>
            </select>
          </div>
        </header>

        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#212121]">
          {messages.slice(1).map((msg, index) => (
            <div
              key={index}
              className={`p-3 md:p-4 rounded-lg max-w-full md:max-w-3xl mx-auto ${msg.role === "user"
                  ? " text-gray-200 text-right self-end flex flex-col items-end"
                  : " text-gray-200 text-left self-start"
                }`}
            >
              <span className="block font-semibold text-gray-400 text-sm md:text-base">
                {msg.role === "user" ? "" : `${selectedModel === "deepseek-r1" ? " - Pensamento Profundo" : ''}`}
              </span>
              {renderMessageContent(msg)}
            </div>
          ))}
          {loading && <p className="text-gray-400 text-center">Digitando...</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* Área de input */}
        <div className="p-3 md:p-4 bg-[#212121] flex justify-center">
          <div className="flex items-center bg-[#303030] px-3 py-2 md:px-4 md:py-3 rounded-lg w-full max-w-full md:max-w-3xl shadow-md border border-gray-600">
            <button onClick={notify} className="mr-2 text-gray-300 hover:text-white">
              <FaPlus size={20} />
            </button>
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-gray-200 text-base md:text-lg placeholder-gray-500"
              placeholder="Envie uma mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={startListening}
              className={`ml-2 p-2 rounded-full text-gray-300 hover:text-white transition ${isListening ? "bg-red-500 animate-pulse" : "bg-transparent"
                }`}
              disabled={loading}
            >
              <AiFillAudio size={20} />
            </button>
            <button
              onClick={sendMessage}
              className="ml-2 p-2 rounded-full text-gray-300 hover:text-white bg-[#10A37F] hover:bg-[#0F8F6F] transition"
              disabled={loading}
            >
              <FaCircleArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}