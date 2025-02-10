'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export default function Home() {
  const [ready, setReady] = useState<boolean>(false);
  const [mp3Url, setMp3Url] = useState<string>('');
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg({ log: true });
      ffmpegRef.current = ffmpeg;
      await ffmpeg.load();
      setReady(true);
    };
    loadFFmpeg();
  }, []);

  const convertToMp3 = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !ffmpegRef.current) return;

    const ffmpeg = ffmpegRef.current;

    await ffmpeg.writeFile('input.wav', await fetchFile(file));
    await ffmpeg.exec(['-i', 'input.wav', 'output.mp3']);
    const data = await ffmpeg.readFile('output.mp3');

    const mp3Blob = new Blob([data.buffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(mp3Blob);
    setMp3Url(url);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Conversor WAV para MP3 com FFmpeg.wasm</h1>
      {!ready ? (
        <p>Carregando FFmpeg...</p>
      ) : (
        <>
          <input type="file" accept="audio/wav" onChange={convertToMp3} />
          {mp3Url && (
            <div style={{ marginTop: '1rem' }}>
              <p>Conversão completa!</p>
              <audio controls src={mp3Url}></audio>
              <br />
              <a href={mp3Url} download="output.mp3">
                Baixar MP3
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
