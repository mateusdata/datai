"use client";
import React, { useState, useEffect, useRef } from "react";
import { Mic, Copy, Check, Code, Headphones, Plus, Menu, X, ArrowUp, Database } from "lucide-react";

export default function App() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const sysMsg = { role: "system", content: "Você Seu nome é DatAI é a IA Data Matemática, e professor de programação." };
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
      showNotification("Erro ao obter resposta.", 'error');
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
      showNotification("Erro ao gerar áudio.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    showNotification("Código copiado!", 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => setMessages([]);
  const toggleSidebar = () => setSidebarOpen(s => !s);
  const navigateToAudio = () => window.location.href = "/audio";

  const parseCodeBlocks = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'text';
        const code = lines.slice(1, -1).join('\n');
        
        return (
          <div key={index} className="relative group my-4 rounded-lg overflow-hidden bg-[#1a1a1a] border border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 bg-[#0f0f0f] border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Code className="text-gray-400" size={14} />
                <span className="text-xs text-gray-400 capitalize">{language}</span>
              </div>
              <button
                onClick={() => copyCode(code, index)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  copiedIndex === index
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
              >
                {copiedIndex === index ? (
                  <>
                    <Check size={12} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <pre className="p-4 text-sm text-gray-300">
                <code className="font-mono">{code}</code>
              </pre>
            </div>
          </div>
        );
      }
      
      return (
        <div key={index} className="prose prose-invert max-w-none">
          {part.split('\n').map((line, lineIndex) => {
            if (line.startsWith('### ')) {
              return <h3 key={lineIndex} className="text-lg font-medium text-white mb-2 mt-3">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={lineIndex} className="text-xl font-medium text-white mb-2 mt-4">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('# ')) {
              return <h1 key={lineIndex} className="text-2xl font-medium text-white mb-3 mt-4">{line.replace('# ', '')}</h1>;
            }
            
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return <li key={lineIndex} className="text-gray-300 ml-4 list-disc">{line.replace(/^[-*] /, '')}</li>;
            }
            if (/^\d+\. /.test(line)) {
              return <li key={lineIndex} className="text-gray-300 ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
            }
            
            if (line.startsWith('> ')) {
              return (
                <blockquote key={lineIndex} className="border-l-2 border-gray-600 pl-4 py-1 my-2 bg-[#1a1a1a]">
                  <div className="text-gray-400 italic">{line.replace('> ', '')}</div>
                </blockquote>
              );
            }
            
            let processedLine = line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
              .replace(/`([^`]+)`/g, '<code class="bg-[#1a1a1a] px-1 py-0.5 rounded text-gray-300 font-mono text-sm">$1</code>');
            
            if (line.trim() === '') {
              return <br key={lineIndex} />;
            }
            
            return (
              <p key={lineIndex} className="text-gray-300 leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: processedLine }} />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="h-screen w-screen bg-[#212121] text-white flex flex-col md:flex-row">
      {/* Notificações */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-3 py-2 rounded text-sm ${
              notification.type === 'success' ? 'bg-green-600' :
              notification.type === 'error' ? 'bg-red-600' :
              'bg-blue-600'
            }`}
          >
            <p className="text-white">{notification.message}</p>
          </div>
        ))}
      </div>

      <button onClick={toggleSidebar} className="md:hidden fixed top-4 left-4 z-50 text-gray-400 p-2 bg-[#171717] rounded">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-[#171717] border-r border-[#1e242d] p-4 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-200 z-40`}>
        <button onClick={clearChat} className="flex items-center justify-center w-full bg-gray-700 hover:bg-gray-600 p-3 mb-4 rounded transition-colors">
          <Plus className="mr-2" size={16} />
          <span>Novo Chat</span>
        </button>
        
        <h3 className="text-gray-500 text-xs font-medium mb-3 uppercase tracking-wide">Conversas</h3>
        <div className="space-y-1">
          <div className="p-3 rounded bg-[#1a1a1a] text-gray-500 text-sm">
            Nenhuma conversa
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={toggleSidebar}></div>}

      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-[#171717] p-4  border-gray-800">
          <div className="hidden md:flex items-center gap-2 text-lg font-medium">
            <Database className="text-gray-400" size={20} />
            <span>DatAI</span>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="px-3 py-2 bg-[#212121] rounded text-white border border-gray-700 focus:border-gray-600 focus:outline-none text-sm"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
              <option value="gemini-1.0">Gemini 1.0</option>
            </select>
            
            <div className="relative">
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-300 underline"
                onClick={() => setShowLimits(!showLimits)}
              >
                Limites
              </button>
              
              {showLimits && (
                <div className="absolute right-0 top-8 bg-[#171717] border border-gray-700 rounded p-4 shadow-lg z-50 min-w-80">
                  <h4 className="font-medium mb-3 text-white">Limites dos Modelos</h4>
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-4 font-medium border-b border-gray-700 pb-2">
                      <span>Modelo</span>
                      <span>Limites Gratuitos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 2.0 Flash</span><span>1.500 req/dia, 15/min  </span></div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 2.0 Flash Lite</span><span>1.500 req/dia, 15/min  </span></div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 1.5 Flash</span><span>1.500 req/dia, 15/min  </span></div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 1.5 Flash 8B</span><span>1.500 req/dia, 15/min  </span></div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 1.5 Pro</span><span>50 req/dia, 2/min  </span></div>
                    <div className="grid grid-cols-2 gap-4 text-gray-400"><span>Gemini 2.0 Pro</span><span>Só Deus sabe se funciona</span></div>
                  </div>
                  <button
                    onClick={() => setShowLimits(false)}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-400"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 bg-[#171717] overflow-y-auto p-4 space-y-4">
          {messages
            .filter(m => m.role !== "system")
            .map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-3xl rounded-lg p-4 ${
                  msg.role === "user" 
                    ? "bg-gray-700 ml-8" 
                    : "bg-[#1a1a1a] mr-8"
                }`}>
                  <div className="space-y-2">
                    {parseCodeBlocks(msg.content)}
                  </div>
                </div>
              </div>
            ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-[#1a1a1a] mr-8">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-gray-400 text-sm">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        <footer className="p-4 bg-[#171717] ">
          <div className="flex flex-col items-center max-w-4xl mx-auto space-y-3">
            <button
              onClick={navigateToAudio}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              <Headphones size={14} />
              Modo Áudio
            </button>
            
            <div className="flex items-center bg-[#303030] p-3 rounded-lg w-full border border-gray-700">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
              />
              
              <button 
                onClick={playAudio} 
                disabled={loading || !messages.length} 
                className="ml-2 p-2 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic size={18} />
              </button>
              
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()} 
                className="ml-2 p-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}