import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { Readable } from 'stream';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PIPER_HOST = process.env.PIPER_HOST;

if (!GEMINI_API_KEY) {
  throw new Error("A variável de ambiente GEMINI_API_KEY não está definida.");
}
if (!PIPER_HOST) {
  throw new Error("A variável de ambiente PIPER_HOST não está definida.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function gerarTextoComGemini(model: string, messages: { role: string, content: string }[]): Promise<string> {
  console.log("🧠 Chamando gerarTextoComGemini...");

  const systemMsg = messages.find(m => m.role === 'system');
  const history = messages.filter(m => m.role === 'user' || m.role === 'model');

  console.log("📚 Histórico de mensagens:", history.map(h => h.content));

  const chat = ai.chats.create({
    model,
    history: history.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction: systemMsg?.content,
      temperature: 0.1,
      maxOutputTokens: 1024,
    }
  });

  const lastUser = history[history.length - 1];
  if (!lastUser || !lastUser.content) {
    throw new Error("Última mensagem do usuário está vazia.");
  }

  console.log("🧠 Enviando última mensagem do usuário:", lastUser.content);

  const result = await chat.sendMessage({ message: lastUser.content });
  const resposta = result?.text;

  if (!resposta || typeof resposta !== "string") {
    throw new Error("Texto gerado pelo Gemini está vazio ou inválido.");
  }

  console.log("✅ Texto gerado pelo Gemini:", resposta);
  return resposta;
}

export async function POST(req: NextRequest) {
  try {
    console.log("📥 Recebendo requisição POST em /api/chat2...");
    const { model, messages } = await req.json();

    if (!model || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Campos 'model' e 'messages' são obrigatórios." },
        { status: 400 }
      );
    }

    const textoGerado = await gerarTextoComGemini(model, messages);

    console.log("🔊 Enviando para Piper TTS...");
    const piperRes = await axios.get(PIPER_HOST!, {
      params: { text: textoGerado },
      responseType: 'stream',
    });


    const nodeStream = piperRes.data as Readable;
    const webStream = Readable.toWeb(nodeStream);

    console.log("📤 Respondendo com stream de áudio...");
    return new NextResponse(webStream as any, {
      status: 200,
      headers: { 'Content-Type': 'audio/wav' },
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint /api/chat2:", {
      message: error?.message,
      stack: error?.stack,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    return NextResponse.json(
      { error: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'API está saudável' }, { status: 200 });
}
