import type { TargetedEvent } from 'preact';
import { useState } from 'react';

export default function App() {
  const [name, setName] = useState('Preact');
  return (
    <div>
      <h1>Hello {name}!</h1>
      <input
        type="text"
        value={name}
        onChange={(e: TargetedEvent<HTMLInputElement>) =>
          setName(e.currentTarget.value)
        }
      />
    </div>
  );
}
