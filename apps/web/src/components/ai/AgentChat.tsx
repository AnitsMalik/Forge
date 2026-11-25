import React, { useState } from 'react';

export const AgentChat: React.FC<{ onSendMessage?: (msg: string) => void }> = ({ onSendMessage }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onSendMessage) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="input flex-1"
        placeholder="Instruct Growth Manager..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button type="submit" className="btn btn-primary">Send</button>
    </form>
  );
};
