import { useState } from 'react';


const SAMPLE_CARDS = [
  { front: 'What is Big-O notation?', back: 'A way to describe algorithm efficiency as input size grows.' },
  { front: 'Define Stack ADT', back: 'LIFO structure with push/pop operations. O(1) for both.' },
  { front: 'Binary Search complexity?', back: 'O(log n) — halves search space each iteration.' },
  { front: 'What is a CO?', back: 'Course Outcome — measurable skills a student gains from a course.' },
];

const FlashcardViewer = () => {
  const [flipped, setFlipped] = useState({});
  const [index, setIndex] = useState(0);

  const card = SAMPLE_CARDS[index];
  const isFlipped = flipped[index];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Flashcard Revision</h2>
          <p>Quick revision flashcards generated from your study material and weak COs.</p>
        </div>
      </div>

      <div className="feature-panel feature-panel--solid flashcard" onClick={() => setFlipped({ ...flipped, [index]: !isFlipped })} style={{ maxWidth: 480, margin: '0 auto', cursor: 'pointer' }}>
        <div className="flashcard__label">{isFlipped ? 'Answer' : 'Question'}</div>
        <div className={isFlipped ? 'flashcard__back' : 'flashcard__front'}>
          {isFlipped ? card.back : card.front}
        </div>
        <p style={{ marginTop: 16, fontSize: '0.75rem', color: '#ffffff', textAlign: 'center' }}>Tap to flip · {index + 1}/{SAMPLE_CARDS.length}</p>
      </div>

      <div className="feature-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
        <button type="button" className="glass-btn glass-btn--ghost" onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped({}); }} disabled={index === 0}>Previous</button>
        <button type="button" className="glass-btn glass-btn--primary" onClick={() => { setIndex(Math.min(SAMPLE_CARDS.length - 1, index + 1)); setFlipped({}); }} disabled={index === SAMPLE_CARDS.length - 1}>Next</button>
      </div>
    </div>
  );
};

export default FlashcardViewer;
