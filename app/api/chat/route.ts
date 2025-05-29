import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

env: {
  GEMINI_API_KEY: "string";
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function streamGeminiChat(model: string, messages: any[]): Promise<ReadableStream> {
  const systemMsg = messages.find(m => m.role === 'system');
  const history = messages.filter(m => m.role === 'user' || m.role === 'model');

  const chat = ai.chats.create({
    model,
    history: history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    config: { systemInstruction: systemMsg?.content, temperature: 0.1, maxOutputTokens: 1024 }
  });

  const lastUser = history[history.length - 1];
  const genStream = await chat.sendMessageStream({ message: lastUser.content });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of genStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: { content: chunk.text } })}\n\n`));
      }
      controller.close();
    }
  });

  return stream;
}


export async function POST(request: NextRequest) {
  const { model, messages } = await request.json();
  if (!model || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Model e mensagens obrigatórias' }, { status: 400 });
  }

  const stream = await streamGeminiChat(model, messages);
  return new NextResponse(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }
  });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'API está saudável' }, { status: 200 });
}