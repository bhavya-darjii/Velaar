/* eslint-disable */
// @ts-nocheck
import { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getPresentationHistory, getPresentationById, savePresentationHistory } from '../../services/dataService';
import {
  getCachedLecturePresentationHistory,
  cacheLecturePresentationHistory,
  preloadCoursePresentationHistory,
} from '../../utils/presentationHistoryUtils';
import { downloadLecturePresentation, getRandomThemeId } from '../../utils/presentationExport';
import { generateLecturePresentation } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';
import GlassSelect from '../../components/shared/GlassSelect';
import './LectureOverview.css';

const lectureId = (lecture) => `${lecture?.division || 'A'}-${lecture?.lectureNum || 0}`;

const collectLectures = (roadmap) => {
  if (Array.isArray(roadmap)) return roadmap.map((lecture) => ({ ...lecture, division: lecture.division || 'A' }));
  return Object.entries(roadmap || {}).flatMap(([division, lectures]) =>
    (lectures || []).map((lecture) => ({ ...lecture, division })),
  );
};

const GENERATION_STEPS = [
  { label: 'Analyzing lecture topics & checklist…', duration: 4000 },
  { label: 'Structuring slide sequence…',            duration: 5000 },
  { label: 'Writing concept explanations…',          duration: 7000 },
  { label: 'Crafting analogies & examples…',         duration: 6000 },
  { label: 'Adding real-world applications…',        duration: 5000 },
  { label: 'Writing speaker notes…',                 duration: 6000 },
  { label: 'Generating presentation file…',          duration: 3000 },
];

const LectureCard = ({ course, lecture, globalGenerating, setGlobalGenerating }) => {
  const lectureDiv = lecture?.division || 'A';
  const lectureNum = lecture?.lectureNum || 0;

  // 0ms instant synchronous read from cache
  const [historyList, setHistoryList] = useState(() =>
    getCachedLecturePresentationHistory(course?.id, lectureDiv, lectureNum)
  );
  const [selectedHistoryId, setSelectedHistoryId] = useState(() => {
    const initial = getCachedLecturePresentationHistory(course?.id, lectureDiv, lectureNum);
    return initial[0]?.id || '';
  });

  const [downloadingHistory, setDownloadingHistory] = useState(false);
  const [generatingPpt, setGeneratingPpt] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Real-time synchronization when presentation cache updates
  useEffect(() => {
    const handleUpdate = (e) => {
      if (!course?.id || e.detail?.courseId !== course.id) return;
      if (
        e.detail?.all ||
        (e.detail?.division === lectureDiv && String(e.detail?.lectureNum) === String(lectureNum))
      ) {
        const fresh = getCachedLecturePresentationHistory(course.id, lectureDiv, lectureNum);
        setHistoryList(fresh);
        if (fresh.length > 0) {
          setSelectedHistoryId((prev) => (prev && fresh.some((item) => item.id === prev) ? prev : fresh[0].id));
        } else {
          setSelectedHistoryId('');
        }
      }
    };

    window.addEventListener('velaar_presentation_history_updated', handleUpdate);
    return () => window.removeEventListener('velaar_presentation_history_updated', handleUpdate);
  }, [course?.id, lectureDiv, lectureNum]);

  // Timer + before-unload guard
  useEffect(() => {
    let interval;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    if (generatingPpt) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatingPpt]);

  // Advance through generation steps when generating
  useEffect(() => {
    if (!generatingPpt) {
      setStepIndex(0);
      setProgress(0);
      return;
    }

    const totalDuration = GENERATION_STEPS.reduce((a, s) => a + s.duration, 0);
    let elapsed = 0;
    let currentStep = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    GENERATION_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setStepIndex(i);
      }, elapsed);
      timers.push(t);
      elapsed += step.duration;
    });

    // Smooth progress bar — update every 200ms
    let progressElapsed = 0;
    const progressInterval = setInterval(() => {
      progressElapsed += 200;
      // Cap at 92% — the final jump to 100% happens on completion
      setProgress(Math.min(92, Math.round((progressElapsed / totalDuration) * 100)));
    }, 200);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [generatingPpt]);

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      if (!course?.id || !lecture) return;
      const data = await getPresentationHistory(course.id, lectureDiv, lectureNum);
      if (active && Array.isArray(data)) {
        cacheLecturePresentationHistory(course.id, lectureDiv, lectureNum, data);
        setHistoryList(data);
        if (data.length > 0) {
          setSelectedHistoryId((prev) => (prev && data.some((item) => item.id === prev) ? prev : data[0].id));
        }
      }
    };

    const cached = getCachedLecturePresentationHistory(course?.id, lectureDiv, lectureNum);
    if (!cached || cached.length === 0) {
      fetchHistory();
    }

    return () => {
      active = false;
    };
  }, [course?.id, lectureDiv, lectureNum]);

  const generateNewPpt = async () => {
    if (generatingPpt || done || globalGenerating) {
      if (globalGenerating && !generatingPpt) alert('Another presentation is currently being generated. Please wait.');
      return;
    }
    setGeneratingPpt(true);
    setGlobalGenerating(true);
    setTimer(0);
    setDone(false);
    setError('');
    try {
      const response = await generateLecturePresentation({
        subjectName: course?.subjectName,
        lecture: lecture,
        overview: lecture?.lecturePreparation || null,
        teachingStyle: 'Conceptual',
        course: {
          modules: course?.modules || [],
          lessonPlan: course?.lessonPlan || null,
        },
      });

      if (response?.error) {
        setError('API OVERLOADED — RETRY');
      } else {
        response.themeId = getRandomThemeId();
        await downloadLecturePresentation(response, {
          subjectName: course?.subjectName,
          lectureTitle: lecture.title,
          themeId: response.themeId,
        });

        await savePresentationHistory(course, lecture, response);
        const updatedData = await getPresentationHistory(course.id, lectureDiv, lectureNum);
        cacheLecturePresentationHistory(course.id, lectureDiv, lectureNum, updatedData);
        setHistoryList(updatedData);
        if (updatedData.length > 0) setSelectedHistoryId(updatedData[0].id);

        setProgress(100);
        await new Promise(r => setTimeout(r, 400)); // brief flash of 100%
        setDone(true);
        setTimeout(() => setDone(false), 3500);
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('fetch')) {
        setError('NETWORK ERROR — CHECK CONNECTION');
      } else {
        setError('SERVER ERROR — RETRY');
      }
    }
    setGeneratingPpt(false);
    setGlobalGenerating(false);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const btnLabel = generatingPpt ? 'GENERATING...' : done ? 'DOWNLOADED' : error ? error : 'GENERATE NEW PPT';

  const downloadHistoryPpt = async () => {
    if (!selectedHistoryId) return;
    setDownloadingHistory(true);
    try {
      const historyData = await getPresentationById(selectedHistoryId);
      if (historyData && historyData.presentation_json) {
        await downloadLecturePresentation(historyData.presentation_json, {
          subjectName: course?.subjectName,
          lectureTitle: historyData.lecture_title || lecture?.title,
          themeId: historyData.presentation_json.themeId,
        });
      }
    } catch (error) {
      console.error('Historical PowerPoint export failed:', error);
    }
    setDownloadingHistory(false);
  };

  const currentStep = GENERATION_STEPS[stepIndex];

  return (
    <section className="lecture-identity glass-card">
      <div className="lecture-identity__info">
        <span>LECTURE {lecture.lectureNum} · DIV {lecture.division || 'A'}</span>
        <h3>{lecture.title}</h3>
        <p>{lecture.moduleName || 'Course roadmap'} · {lecture.description || 'Use this assistant to prepare the teaching flow.'}</p>
      </div>
      <div className="lecture-identity__actions">
        <div className="lecture-status">
          <span>{lecture.date ? `Lecture Conducted on: ${lecture.date} · ${lecture.time || 'Time TBD'}` : 'Schedule TBD'}</span>
        </div>

        {generatingPpt && (
          <div className="ppt-progress-panel">
            <div className="ppt-progress-panel__header">
              <span className="ppt-progress-panel__step-label">{currentStep?.label}</span>
              <span className="ppt-progress-panel__timer">{formatTime(timer)}</span>
            </div>
            <div className="ppt-progress-bar-track">
              <div
                className="ppt-progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="ppt-progress-panel__steps">
              {GENERATION_STEPS.map((s, i) => (
                <span
                  key={i}
                  className={`ppt-step-dot${
                    i < stepIndex ? ' ppt-step-dot--done' :
                    i === stepIndex ? ' ppt-step-dot--active' : ''
                  }`}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        )}

        {historyList.length > 0 && !generatingPpt && (
          <div className="lecture-history-mini">
            <span className="lecture-history-mini__label">Previous Presentations</span>
            <div className="lecture-history-mini__controls">
              <GlassSelect
                value={selectedHistoryId}
                onChange={setSelectedHistoryId}
                style={{ width: '180px' }}
                options={historyList.map((item, idx) => {
                  const dateStr = new Date(item.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return {
                    value: item.id,
                    label: `${dateStr} ${idx === 0 ? '(Latest)' : ''}`,
                  };
                })}
              />
              <button
                className="glass-btn glass-btn--ghost history-btn-mini"
                onClick={downloadHistoryPpt}
                disabled={downloadingHistory || !selectedHistoryId}
              >
                {downloadingHistory ? 'Retrieving…' : 'Download'}
              </button>
            </div>
          </div>
        )}

        <button
          className={`glass-btn glass-btn--primary generate-btn-mini${generatingPpt ? ' glass-btn--loading' : ''}${done ? ' glass-btn--done' : ''}`}
          onClick={generateNewPpt}
          disabled={generatingPpt || done}
        >
          {generatingPpt && <span className="ppt-spinner" style={{ marginTop: 7 }} />}
          {btnLabel}
        </button>
      </div>
    </section>
  );
};

const LectureOverview = () => {
  const { course, currentLecture } = useOutletContext() || {};
  const lectures = useMemo(() => collectLectures(course?.roadmap), [course?.roadmap]);

  const divisions = useMemo(() => [...new Set(lectures.map(l => l.division || 'A'))].sort(), [lectures]);

  const [activeDivision, setActiveDivision] = useState(currentLecture?.division || divisions[0] || 'A');
  const [globalGenerating, setGlobalGenerating] = useState(false);

  const completedLectures = useMemo(() => {
    return lectures
      .filter(l => (l.division || 'A') === activeDivision && l.isCompleted)
      .sort((a, b) => (b.lectureNum || 0) - (a.lectureNum || 0));
  }, [activeDivision, lectures]);

  useEffect(() => {
    if (course?.id) {
      preloadCoursePresentationHistory(course.id);
    }
  }, [course?.id]);

  if (!course) {
    return (
      <div className="lecture-empty glass-card">
        <h2>Create a course before preparing a lecture</h2>
        <p>Velaar uses your syllabus and roadmap to ground each lecture preparation.</p>
      </div>
    );
  }

  return (
    <div className="lecture-overview">
      <header className="lecture-overview__header">
        <div className="lecture-overview__header-content">
          <h2>Lecture Archive & Presentations</h2>
          <p>Access your previously completed lectures, retrieve past presentations, or generate new ones on the fly.</p>
        </div>
        {divisions.length > 1 && (
          <div className="lecture-overview__divisions">
            <SegmentedToggle
              options={divisions.map(d => ({ value: d, label: `Div ${d}` }))}
              value={activeDivision}
              onChange={setActiveDivision}
            />
          </div>
        )}
      </header>

      <main className="lecture-overview__main">
        {completedLectures.length > 0 ? (
          completedLectures.map(lecture => (
            <LectureCard
              key={`${lecture.division || 'A'}-${lecture.lectureNum}`}
              course={course}
              lecture={lecture}
              globalGenerating={globalGenerating}
              setGlobalGenerating={setGlobalGenerating}
            />
          ))
        ) : (
          <div className="lecture-empty glass-card">
            <h2 style={{ fontSize: '1.2rem' }}>No completed lectures yet in Div {activeDivision}</h2>
            <p>Once you complete lectures, they will appear here along with their presentations.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LectureOverview;

