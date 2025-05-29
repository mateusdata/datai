"use client";
import React, { useState, useEffect, useRef } from "react";
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
  const [currentCodeIndex, setCurrentCodeIndex] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const sysMsg = { role: "system", content: "Você Seu nome é DatAI é a IA Data Matemática,  e professor de programação." };
    const userMsg = { role: "user", content: input };
    const hasSystem = messages.some(m => m.role === "system");
    const newHistory = hasSystem ? [...messages, userMsg] : [sysMsg, ...messages, userMsg];

    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: newHistory }),
      });

      if (!res.body) throw new Error("Sem resposta da stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { role: "assistant", content: "" };
      const index = newHistory.length;

      setMessages(prev => [...prev, assistantMsg]);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = line.replace(/^data:\s*/, "");
            const { message } = JSON.parse(payload);
            assistantMsg.content += message.content;
            setMessages(prev => {
              const copy = [...prev];
              copy[index] = { ...assistantMsg };
              return copy;
            });
          } catch (err) {
            console.warn("Linha inválida:", line);
          }
        }
      }
    } catch (err) {
      toast.error("Erro ao obter resposta.");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async () => {
    if (!messages.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages }),
      });

      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
    } catch {
      toast.error("Erro ao gerar áudio.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string, i: number) => {
    navigator.clipboard.writeText(code);
    setCurrentCodeIndex(i);
    setTimeout(() => setCurrentCodeIndex(null), 1000);
  };

  const clearChat = () => setMessages([]);
  const toggleSidebar = () => setSidebarOpen(s => !s);

  const renderContent = (msg: { role: string; content: string }) => {
    const parts = msg.content.split(/```([\s\S]+?)```/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <div key={i} className="relative my-2">
          <button
            onClick={() => copyCode(part, i)}
            className={`absolute top-2 right-2 ${currentCodeIndex === i ? "bg-green-600" : "bg-gray-600"
              } text-white text-sm px-2 py-1 rounded-lg`}
          >
            {currentCodeIndex === i ? "Copiado!" : "Copiar"}
          </button>
          <SyntaxHighlighter language="javascript" style={oneDark} className="rounded-lg p-3">
            {part}
          </SyntaxHighlighter>
        </div>
      ) : (
        <div key={i} className="mb-2 text-gray-300">
          <ReactMarkdown>{part}</ReactMarkdown>
        </div>
      )
    );
  };

  return (
    <div className="h-screen w-screen bg-[#202123] text-white flex flex-col md:flex-row">
      <button onClick={toggleSidebar} className="md:hidden fixed top-4 left-4 text-gray-300 p-2">
        {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-[#171717] p-4 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <button onClick={clearChat} className="flex items-center bg-[#212121] p-2 mb-4 rounded-lg">
          <FaPlus className="mr-2" /> Novo Chat
        </button>
        <h3 className="text-gray-400 text-sm mb-2">Histórico</h3>
        <ul className="space-y-2 text-gray-300"></ul>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden" onClick={toggleSidebar}></div>}

      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-[#212121] p-4">
          <div className="hidden md:flex items-center gap-2 text-lg font-bold">
            <BsClipboardDataFill />
            <span>DatAI</span>
          </div>
            <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="p-2 bg-[#303030] rounded-lg text-white"
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-pro">gemini-2.0-pro</option>
              <option value="gemini-1.0">gemini-1.0</option>
            </select>
            <button
              type="button"
              className="text-xs text-gray-400 underline ml-2"
              onClick={() => {
              toast.info(
                <div>
                <table className="text-xs">
                  <thead>
                  <tr>
                    <th className="pr-2 text-left">Modelo</th>
                    <th className="text-left">Limites Gratuitos</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr>
                    <td className="pr-2">gemini-2.0-flash</td>
                    <td>1.500 req/dia, 15 req/min, 1M tokens/min</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-2.0-flash-lite</td>
                    <td>1.500 req/dia, 15 req/min, 1M tokens/min</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-1.5-flash</td>
                    <td>1.500 req/dia, 15 req/min, 1M tokens/min</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-1.5-flash-8b</td>
                    <td>1.500 req/dia, 15 req/min, 1M tokens/min</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-1.5-pro</td>
                    <td>50 req/dia, 2 req/min, 32.000 tokens/min</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-2.0-pro</td>
                    <td>Desconhecido</td>
                  </tr>
                  <tr>
                    <td className="pr-2">gemini-1.0</td>
                    <td>Desconhecido</td>
                  </tr>
                  </tbody>
                </table>
                </div>,
                { autoClose: 8000 }
              );
              }}
            >
              Limites
            </button>
            </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#212121]">
          {messages
            .filter(m => m.role !== "system")
            .map((msg, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-full md:max-w-3xl mx-auto ${msg.role === "user" ? "self-end text-right" : "self-start text-left"}`}>
                {renderContent(msg)}
              </div>
            ))}
          {loading && (
            <div className="flex justify-center items-end  py-4">
              <div className="w-[45%]  flex items-end justify-end">
                <svg className="animate-spin h-6 w-6 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>

            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        <footer className="p-3 bg-[#212121] flex justify-center">
          <div className="flex items-center bg-[#303030] p-2 rounded-lg w-full max-w-3xl border border-gray-600 shadow-md">
            <button onClick={clearChat} className="mr-2 text-gray-300 hover:text-white">
              <FaPlus size={20} />
            </button>
            <input
              type="text"
              placeholder="Envie uma mensagem..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-500"
            />
            <button onClick={playAudio} disabled={loading} className="ml-2 p-2 rounded-full text-gray-300 hover:text-white">
              <AiFillAudio size={20} />
            </button>
            <button onClick={sendMessage} disabled={loading} className="ml-2 p-2 rounded-full bg-[#10A37F] hover:bg-[#0F8F6F] text-gray-300">
              <FaCircleArrowUp size={20} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
