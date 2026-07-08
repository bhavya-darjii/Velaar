import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { sendCopilotMessage } from '../../services/aiService';
import { useCopilotContext } from '../../context/CopilotContext';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './VelaarCopilotV2.css';

const QUICK_ACTIONS = [
  'Generate a question paper',
  'Evaluate answer scripts',
  'Create a new lesson plan',
];

const PAGE_HINTS = {
  '/teacher': 'home dashboard and lecture progress',
  '/teacher/lesson-plan': 'lesson plan and CO-PO mapping',
  '/teacher/marks': 'student marks and assessments',
  '/teacher/examination': 'question papers and exams',
  '/teacher/co-attainment': 'CO attainment and NBA compliance',
  '/teacher/answer-evaluator': 'AI answer script grading',
  '/admin': 'AI usage analytics and admin tasks',
  '/hod': 'department overview and teachers',
  '/student': 'exams and study materials',
  '/parent': 'child performance and alerts',
};

const getPageLabel = (pathname) => {
  const match = Object.entries(PAGE_HINTS).find(([path]) =>
    pathname === path || (path !== '/' && pathname.startsWith(path + '/'))
  );
  return match ? match[1] : 'the current Velaar page';
};

const VelaarCopilotV2 = ({ userRole = 'teacher' }) => {
  const location = useLocation();
  const { pageContext } = useCopilotContext();
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [userName, setUserName] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchName = async () => {
      const user = auth.currentUser;
      if (!user) return;
      if (user.displayName) {
        setUserName(user.displayName.split(' ')[0]);
      } else {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            const name = data.name || data.fullName || '';
            setUserName(name.split(' ')[0]);
          }
        } catch {}
      }
    };
    fetchName();
  }, []);

  const pageLabel = useMemo(() => getPageLabel(location.pathname), [location.pathname]);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        if (!input.trim() && !showPanel) {
          setIsFocused(false);
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [input, showPanel]);

  useEffect(() => {
    if (isFocused || input.trim()) {
      setIsExpanded(true);
    } else if (!showPanel) {
      setIsExpanded(false);
    }
  }, [isFocused, input, showPanel]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    const userMessage = { role: 'user', content: msg };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setShowPanel(true);
    setIsTyping(true);
    setIsExpanded(true);
    setIsFocused(true);

    try {
      const data = await sendCopilotMessage(nextMessages, {
        userRole,
        pagePath: location.pathname,
        pageLabel,
        pageContext,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || data.error || 'Velaar AI encountered an issue. Please try again.' },
      ]);
    } catch (err) {
      console.error('Copilot send error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check that the backend server is running.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    inputRef.current?.focus();
    setIsFocused(true);
    setIsExpanded(true);
  };

  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div
      ref={wrapperRef}
      className={`copilot-v2 ${isExpanded ? 'copilot-v2--expanded' : ''} ${isFocused ? 'copilot-v2--focused' : ''} ${showPanel ? 'copilot-v2--panel-open' : ''}`}
    >
      {/* Quick action chips */}
      <div className={`copilot-v2__chips ${!showPanel && (isFocused || isExpanded) ? 'copilot-v2__chips--visible' : ''}`}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="copilot-v2__chip"
            onClick={() => handleQuickAction(action)}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Response panel rises above the bar */}
      {showPanel && (
        <div className="copilot-v2__panel">
          <div className="copilot-v2__panel-header">
            <span className="copilot-v2__panel-title">
              <span className="copilot-v2__dot" />
              Velaar Copilot
            </span>
            <button
              type="button"
              className="copilot-v2__panel-close"
              onClick={() => { setShowPanel(false); setMessages([]); }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="copilot-v2__panel-body">
            {messages.filter((m) => m.role === 'user').slice(-1).map((m, i) => (
              <p key={i} className="copilot-v2__user-msg">{m.content}</p>
            ))}
            {isTyping ? (
              <div className="copilot-v2__typing">
                <span /><span /><span />
              </div>
            ) : lastReply ? (
              <p className="copilot-v2__reply">{lastReply.content}</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Main pill bar */}
      <form
        className="copilot-v2__bar"
        onClick={() => inputRef.current?.focus()}
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
      >
        <div className="copilot-v2__orbs" aria-hidden="true">
          <div className="copilot-v2__orb copilot-v2__orb--1" />
          <div className="copilot-v2__orb copilot-v2__orb--2" />
          <div className="copilot-v2__orb copilot-v2__orb--3" />
        </div>

        <div className="copilot-v2__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="copilot-v2__input"
          placeholder={userName ? `Ask anything or search, ${userName}` : 'Ask anything or search'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          disabled={isTyping}
          autoComplete="off"
        />

        <button
          type="submit"
          className="copilot-v2__send"
          disabled={isTyping}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default VelaarCopilotV2;
