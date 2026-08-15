/* eslint-disable */
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { sendCopilotMessage } from '../../services/aiService';
import './VelaarAIPrompt.css';

const SUGGESTION_CHIPS = [
  "Show today's lectures?",
  "How many completed?",
  "Check attendance?"
];

const VelaarAIPrompt = ({ className = '' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [response, setResponse]   = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const inputRef   = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const handleSend = async (e, customInput = null) => {
    if (e) e.preventDefault();
    const textToSend = customInput || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user', content: textToSend.trim() };
    setIsClosing(false);
    setShowResponse(true);
    setResponse('');
    setIsTyping(true);
    setInput('');
    const data = await sendCopilotMessage([userMessage]);
    setIsTyping(false);
    setResponse(data.reply || 'Velaar AI encountered an anomaly.');
  };

  const closeResponse = () => {
    setIsClosing(true);
    setTimeout(() => { setShowResponse(false); setIsClosing(false); setResponse(''); }, 420);
  };

  const handleChipClick = (text) => {
    setInput(text);
    handleSend(null, text);
  };

  return (
    <div ref={wrapperRef} className={`velaar-ai-wrapper ${isFocused ? 'focused' : ''} ${className}`}>

      {/* Suggestion Chips */}
      <div className="velaar-ai-chips">
        {SUGGESTION_CHIPS.map((chip, idx) => (
          <button 
            key={idx} 
            type="button" 
            className="vai-chip"
            onClick={() => handleChipClick(chip)}
          >
            {chip} <span className="vai-chip-icon">â—</span>
          </button>
        ))}
      </div>

      {/* Bubbly WWDC orbs */}
      <div className="velaar-ai-orbs" aria-hidden="true">
        <div className="vai-orb vai-orb-1" />
        <div className="vai-orb vai-orb-2" />
        <div className="vai-orb vai-orb-3" />
        <div className="vai-orb vai-orb-4" />
      </div>

      <form className="velaar-ai-input-container" onSubmit={handleSend}>
        {/* Spark icon */}
        <div className="velaar-ai-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="velaar-ai-input"
          placeholder="Ask anything or search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          disabled={isTyping}
          autoComplete="off"
        />

        {/* Send arrow — Always visible */}
        <button type="submit" className="velaar-ai-send"
          disabled={isTyping} aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>

      {(showResponse || isClosing) && (
        <div className={`velaar-ai-response-panel ${showResponse && !isClosing ? 'visible' : 'closing'}`}>
          <div className="ai-response-header">
            <div className="ai-response-title">
              <span className="ai-response-title-dot" />
              Velaar AI
            </div>
            <button className="ai-close-btn" onClick={closeResponse} type="button" aria-label="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="velaar-ai-response-content">
            {isTyping ? (
               <div className="liquid-typing">
                 <div className="liquid-dot" /><div className="liquid-dot" /><div className="liquid-dot" />
               </div>
            ) : <p>{response}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default VelaarAIPrompt;

