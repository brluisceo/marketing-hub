'use client';
import { useState } from 'react';

export default function Thumb({ id, formato, className }: { id: string; formato?: string; className?: string }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <span className={'thumb ' + (className || '')}>
      {!falhou ? <img src={`/api/thumb/${id}`} alt="" loading="lazy" onError={() => setFalhou(true)} /> : null}
      {formato ? <span className="thumb-tag">{formato}</span> : null}
    </span>
  );
}
