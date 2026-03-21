import { useState } from 'react';

interface Props {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function PromptBar({ onSubmit, isLoading, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form className="prompt-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="prompt-input"
        placeholder={
          disabled
            ? 'Select courses first...'
            : 'Try: "move classes to the afternoon" or "prefer better professors"'
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isLoading || disabled}
      />
      <button
        type="submit"
        className="prompt-submit"
        disabled={isLoading || disabled || !value.trim()}
      >
        {isLoading ? (
          <span className="spinner" />
        ) : (
          <span>{'↵'}</span>
        )}
      </button>
    </form>
  );
}
