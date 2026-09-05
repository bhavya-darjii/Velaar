/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getPresentationById } from '../../services/dataService';
import { downloadLecturePresentation, getRandomThemeId } from '../../utils/presentationExport';
import '../teacher/LectureOverview.css';
import './LectureVault.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const toSubjectSlug = (name = '') =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getDivisionLectures = (roadmap, division = 'A') => {
  if (!roadmap) return [];
  if (Array.isArray(roadmap)) {
    return roadmap
      .filter((l) => (l.division || 'A') === division)
      .map((l) => ({ ...l, division }));
  }
  const divList = roadmap[division] || roadmap['A'] || [];
  return divList.map((l) => ({ ...l, division }));
};

// ─── Main Component ───────────────────────────────────────────────────────────

const LectureVault = () => {
  const navigate = useNavigate();
  const { subjectSlug } = useParams();

  const [courses, setCourses] = useState([]);
  const [presentationsMap, setPresentationsMap] = useState(new Map());
  const [studentDivision, setStudentDivision] = useState('A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Downloading state per lecture key
  const [downloadingId, setDownloadingId] = useState('');

  // 1. Fetch student profile, courses & presentations
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (mounted) {
            setError('Not signed in.');
            setLoading(false);
          }
          return;
        }

        // Fetch student profile (division, semester, institution)
        const { data: profile } = await supabase
          .from('users')
          .select('institution_id, semester, department, division')
          .eq('id', session.user.id)
          .single();

        if (!profile?.institution_id) {
          if (mounted) {
            setError('Your student profile is incomplete. Please contact your administrator.');
            setLoading(false);
          }
          return;
        }

        const div = (profile.division ? String(profile.division).trim().toUpperCase() : 'A');
        if (mounted) setStudentDivision(div);

        // Query courses for this student's institution + semester
        let coursesQuery = supabase
          .from('courses')
          .select('id, name, subject_name, semester, department, total_lectures, roadmap, teacher_id')
          .eq('institution_id', profile.institution_id);

        if (profile.semester) {
          coursesQuery = coursesQuery.eq('semester', String(profile.semester));
        }
        if (profile.department) {
          coursesQuery = coursesQuery.eq('department', profile.department);
        }

        const { data: coursesData, error: coursesError } = await coursesQuery;
        if (coursesError) throw coursesError;

        const courseList = (coursesData || []).map((c) => ({
          ...c,
          subjectName: c.subject_name || c.name || 'Untitled Subject',
        }));

        if (courseList.length === 0) {
          if (mounted) {
            setCourses([]);
            setLoading(false);
          }
          return;
        }

        const courseIds = courseList.map((c) => c.id);

        // Fetch presentation history for all courses
        const { data: historyData, error: historyError } = await supabase
          .from('presentation_history')
          .select('id, created_at, lecture_title, division, lecture_num, course_id')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        // Group by key: ${course_id}-${division}-${lecture_num} (first is latest)
        const pMap = new Map();
        for (const item of historyData || []) {
          const itemDiv = item.division || 'A';
          const num = item.lecture_num ?? 0;
          const key = `${item.course_id}-${itemDiv}-${num}`;
          if (!pMap.has(key)) {
            pMap.set(key, item);
          }
        }

        if (mounted) {
          setCourses(courseList);
          setPresentationsMap(pMap);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load student lecture vault:', err);
        if (mounted) {
          setError('Failed to load courses and presentations.');
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Computed presentation & completed count per course for the student's specific division
  const courseStats = useMemo(() => {
    const stats = {};
    for (const c of courses) {
      const divLectures = getDivisionLectures(c.roadmap, studentDivision);
      // Only count completed lectures conducted for THIS division
      const completedCount = divLectures.filter((l) => l.isCompleted).length;

      // Count presentations available for this course in this division
      let pptCount = 0;
      for (const [key] of presentationsMap.entries()) {
        if (key.startsWith(`${c.id}-${studentDivision}-`)) {
          pptCount++;
        }
      }

      stats[c.id] = {
        pptCount,
        completedCount,
        totalLectures: divLectures.length || c.total_lectures || 0,
      };
    }
    return stats;
  }, [courses, presentationsMap, studentDivision]);

  // 3. Resolve selected course from URL parameter `subjectSlug`
  const selectedCourse = useMemo(() => {
    if (!subjectSlug || courses.length === 0) return null;
    return (
      courses.find(
        (c) =>
          toSubjectSlug(c.subjectName) === subjectSlug ||
          toSubjectSlug(c.name) === subjectSlug ||
          c.id === subjectSlug
      ) || null
    );
  }, [subjectSlug, courses]);

  // 4. Completed lectures conducted for this division in decremental order (latest first: 12, 11, 10 ... 1)
  const visibleLectures = useMemo(() => {
    if (!selectedCourse) return [];
    const divRoadmap = getDivisionLectures(selectedCourse.roadmap, studentDivision);
    // Only completed lectures conducted for this student's division
    const completed = divRoadmap.filter((l) => l.isCompleted);
    // Chronological order first to assign sequential lecture number 1..N
    const chronological = completed.sort((a, b) => (a.lectureNum || 0) - (b.lectureNum || 0));
    const indexed = chronological.map((l, idx) => ({
      ...l,
      sequentialNum: idx + 1,
    }));
    // Decremental order (most recent first: N ... 1)
    return indexed.sort((a, b) => b.sequentialNum - a.sequentialNum);
  }, [selectedCourse, studentDivision]);

  // 5. Download latest PPT handler
  const handleDownload = async (latestPpt, lecture) => {
    const lectureKey = `${studentDivision}-${lecture.lectureNum}`;
    if (downloadingId) return;

    setDownloadingId(lectureKey);
    try {
      const historyData = await getPresentationById(latestPpt.id);
      if (historyData && historyData.presentation_json) {
        await downloadLecturePresentation(historyData.presentation_json, {
          subjectName: selectedCourse.subjectName,
          lectureTitle: historyData.lecture_title || lecture.title,
          themeId: historyData.presentation_json.themeId || getRandomThemeId(),
        });
      } else {
        alert('Presentation file data not found.');
      }
    } catch (e) {
      console.error('PowerPoint download failed:', e);
      alert('Unable to download presentation. Please try again.');
    } finally {
      setDownloadingId('');
    }
  };

  // ─── Loading / Error States ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="lv-container">
        <div className="lv-loading-shell">
          <div className="lv-skeleton lv-skeleton--title" />
          <div className="lv-skeleton lv-skeleton--sub" />
          <div className="lv-subjects-grid" style={{ marginTop: '28px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="lv-skeleton lv-skeleton--card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lv-container">
        <div className="lecture-empty glass-card">
          <h2>Unable to Load Lecture Vault</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // ─── VIEW 1: All Subjects Cards (when no subjectSlug is selected) ────────────

  if (!selectedCourse) {
    return (
      <div className="lv-container">
        <header className="lv-main-header">
          <div className="lv-main-header__content">
            <h2>Lecture Vault</h2>
            <p>Access your subjects to browse lecture topics, reviews, and download latest presentation materials.</p>
          </div>
          <div className="lv-header-badge">
            {courses.length} {courses.length === 1 ? 'Subject' : 'Subjects'}
          </div>
        </header>

        {courses.length === 0 ? (
          <div className="lecture-empty glass-card">
            <h2>No Enrolled Subjects Found</h2>
            <p>You currently do not have courses registered for your semester. Please check with your department coordinator.</p>
          </div>
        ) : (
          <div className="lv-subjects-grid">
            {courses.map((course) => {
              const stats = courseStats[course.id] || { pptCount: 0, completedCount: 0, totalLectures: 0 };
              const slug = toSubjectSlug(course.subjectName);

              return (
                <div
                  key={course.id}
                  className="lv-subject-card glass-card"
                  onClick={() => navigate(`/student/lecture-vault/${slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/student/lecture-vault/${slug}`);
                    }
                  }}
                >
                  <div className="lv-subject-card__top">
                    {/* Clean SEM badge without department name */}
                    <span className="lv-subject-card__tag">
                      {course.semester ? `SEM ${course.semester}` : 'COURSE'}
                    </span>
                    {stats.pptCount > 0 && (
                      <span className="lv-subject-card__ppt-badge">
                        {stats.pptCount} {stats.pptCount === 1 ? 'PPT' : 'PPTs'} Available
                      </span>
                    )}
                  </div>

                  <h3 className="lv-subject-card__title">{course.subjectName}</h3>
                  {/* Clean course description without repeating department name */}
                  <p className="lv-subject-card__desc">
                    Course lectures and presentation slides archive.
                  </p>

                  <div className="lv-subject-card__footer">
                    {/* Accurately reflects only the completed lectures of the student's division */}
                    <div className="lv-subject-card__meta">
                      <span>{stats.completedCount} Completed {stats.completedCount === 1 ? 'Lecture' : 'Lectures'}</span>
                    </div>
                    <div className="lv-subject-card__action">
                      <span>View Lectures</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW 2: Selected Subject Lecture Overview ──────────────────────────────
  // - URL reflects subject: /student/lecture-vault/:subjectSlug
  // - Top bar: Only "← All Subjects" button (no course text next to it)
  // - Header: No Div A / Div B toggle
  // - Lectures: Incremental numbering 1, 2, 3, 4... for this division

  return (
    <div className="lv-container">
        {/* Header: heading and sub-header */}
        <header className="lecture-overview__header">
          <div className="lecture-overview__header-content">
            <h2>Lecture Archive & Presentations</h2>
            <p>Access your previously completed lectures, retrieve past presentations.</p>
          </div>
        </header>

        <main className="lecture-overview__main">
          {visibleLectures.length > 0 ? (
            visibleLectures.map((lecture) => {
              const lectureKey = `${studentDivision}-${lecture.lectureNum}`;
              const pptKey = `${selectedCourse.id}-${studentDivision}-${lecture.lectureNum}`;
              const latestPpt = presentationsMap.get(pptKey);
              const isDownloading = downloadingId === lectureKey;

              return (
                <section key={lectureKey} className="lecture-identity glass-card">
                  <div className="lecture-identity__info">
                    {/* Decremental sequential number: 12, 11, 10... */}
                    <span>LECTURE {lecture.sequentialNum}</span>
                    <h3>{lecture.title}</h3>
                    <p>{lecture.moduleName || 'Course roadmap'} · {lecture.description || 'Use this assistant to prepare the teaching flow.'}</p>
                  </div>

                  <div className="lecture-identity__actions">
                    <div className="lecture-status">
                      <span>{lecture.date ? `Lecture Conducted on: ${lecture.date} · ${lecture.time || 'Time TBD'}` : 'Schedule TBD'}</span>
                    </div>

                    {/* Exact same Previous Presentations container & Download button from LectureOverview */}
                    {latestPpt ? (
                      <div className="lecture-history-mini">
                        <span className="lecture-history-mini__label">Previous Presentations</span>
                        <div className="lecture-history-mini__controls">
                          <button
                            className="glass-btn glass-btn--ghost history-btn-mini"
                            onClick={() => handleDownload(latestPpt, lecture)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? 'Retrieving…' : 'Download'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="lecture-history-mini">
                        <span className="lecture-history-mini__label">Previous Presentations</span>
                        <div className="lecture-history-mini__controls">
                          <button
                            className="glass-btn glass-btn--ghost history-btn-mini"
                            disabled
                            style={{ opacity: 0.45, cursor: 'not-allowed' }}
                          >
                            No PPT Available
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="lecture-empty glass-card">
              <h2>No completed lectures found</h2>
              <p>Lectures will appear here once conducted by your faculty.</p>
            </div>
          )}
        </main>
    </div>
  );
};

export default LectureVault;
