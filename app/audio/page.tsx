'use client';

import { useState } from 'react';
import createModule from '@transcribe/shout';
import { FileTranscriber } from '@transcribe/transcriber';

const TranscricaoAudio: React.FC = () => {
  const [transcricao, setTranscricao] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setTranscricao('');

    try {
      const transcriber = new FileTranscriber({
        createModule,
        model: '/path/to/ggml-tiny-q5_1.bin', // Substitua pelo caminho correto do modelo
      });

      await transcriber.init();

      const result = await transcriber.transcribe(file);
      setTranscricao(result.transcription.map(segment => segment.text).join(' '));
    } catch (error) {
      console.error('Erro ao processar o arquivo:', error);
      setTranscricao('Erro ao processar o arquivo.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Transcrição de Áudio WAV para Texto</h1>
      <input type="file" accept=".wav" onChange={handleFileChange} />
      {carregando && <p>Transcrevendo...</p>}
      {transcricao && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Texto Transcrito:</h2>
          <p>{transcricao}</p>
        </div>
      )}
    </div>
  );
};

export default TranscricaoAudio;
