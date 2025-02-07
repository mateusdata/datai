"use client";
import React, { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function App() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currenMessageIndex, setCurrentMessageIndex] = useState<number | null>(null);  

  const sendMessage = async () => {
    if (!input.trim()) return;

    const systemMessage = {
      role: "system",
      content: "Você é um assistente chamado Mateus AI, criado por Mateus Santos. Responda em português e mantenha o contexto da conversa."
    };

    const newMessage = { role: "user", content: input };

    const hasSystemMessage = messages.some(msg => msg.role === "system");
    const updatedMessages = hasSystemMessage ? [...messages, newMessage] : [systemMessage, ...messages, newMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const response = await fetch("https://7b6b-2804-7d74-8f-e100-5d24-bfcf-7e97-301.ngrok-free.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v2",
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

  const copyToClipboard = (code: string, index:number) => {
    navigator.clipboard.writeText(code);
    setCurrentMessageIndex(index);
    setTimeout(() => setCurrentMessageIndex(null), 1000); 
  };
 
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

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      <header className="p-4 text-center text-lg font-bold bg-gray-800 shadow-md">
        🤖 Mateus AI
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg max-w-3xl mx-auto ${
              msg.role === "user"
                ? "bg-blue-600 text-white text-right self-end"
                : "bg-gray-700 text-left"
            }`}
          >
            <span className="block font-semibold">{msg.role === "user" ? "Você" : "Mateus AI"}</span>
            {renderMessageContent(msg.content)}
          </div>
        ))}
        {loading && <p className="text-gray-400 text-center">Digitando...</p>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-900 flex justify-center">
        <div className="flex items-center bg-gray-800 px-4 py-3 rounded-full w-full max-w-2xl shadow-md">
          <button className="text-gray-400 hover:text-white transition">➕</button>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg px-4 placeholder-gray-500"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="text-gray-400 hover:text-white transition">⚙️</button>
          <button
            onClick={sendMessage}
            className="ml-2 bg-blue-600 px-4 py-2 rounded-full text-white text-lg hover:bg-blue-700 transition"
            disabled={loading}
          >
            🎤
          </button>
        </div>
      </div>
    </div>
  );
}
