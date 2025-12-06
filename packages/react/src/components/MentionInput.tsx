import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface MentionSuggestion {
  id: string;
  name: string;
  avatar?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  enableMentions?: boolean;
  getMentionSuggestions?: (query: string) => Promise<MentionSuggestion[]>;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  enableMentions = false,
  getMentionSuggestions,
  inputRef: externalRef,
  rows = 4,
  className = '',
  autoFocus = false,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalRef || internalRef;
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @mention trigger
  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (!enableMentions || !getMentionSuggestions) {
        return;
      }

      const cursorPos = e.target.selectionStart || 0;
      const textBeforeCursor = newValue.slice(0, cursorPos);

      // Find the last @ symbol before cursor
      const atIndex = textBeforeCursor.lastIndexOf('@');

      if (atIndex >= 0) {
        // Check if @ is at start or preceded by whitespace
        const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
          const query = textBeforeCursor.slice(atIndex + 1);

          // Check if query is valid (no spaces, only word chars)
          if (/^\w*$/.test(query)) {
            setMentionStart(atIndex);
            setMentionQuery(query);

            try {
              const results = await getMentionSuggestions(query);
              setSuggestions(results.slice(0, 5));
              setShowSuggestions(results.length > 0);
              setSelectedIndex(0);
            } catch {
              setSuggestions([]);
              setShowSuggestions(false);
            }
            return;
          }
        }
      }

      // No valid mention trigger
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStart(-1);
    },
    [enableMentions, getMentionSuggestions, onChange]
  );

  // Insert selected mention
  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
      const beforeMention = value.slice(0, mentionStart);
      const afterMention = value.slice(mentionStart + mentionQuery.length + 1);
      const newValue = `${beforeMention}@${suggestion.name} ${afterMention}`;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStart(-1);

      // Focus input and set cursor after mention
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = beforeMention.length + suggestion.name.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, mentionStart, mentionQuery, onChange, inputRef]
  );

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSuggestions && suggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % suggestions.length);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
            break;
          case 'Enter':
          case 'Tab':
            e.preventDefault();
            insertMention(suggestions[selectedIndex]);
            break;
          case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            break;
        }
      } else if (e.key === 'Enter' && e.ctrlKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertMention, onSubmit]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputRef]);

  return (
    <div className="threadkit-mention-input-wrapper">
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className={`threadkit-textarea ${className}`}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        autoFocus={autoFocus}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="threadkit-mention-suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              className={`threadkit-mention-suggestion ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => insertMention(suggestion)}
              type="button"
            >
              {suggestion.avatar && (
                <img
                  src={suggestion.avatar}
                  alt=""
                  className="threadkit-mention-avatar"
                />
              )}
              <span className="threadkit-mention-name">{suggestion.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
