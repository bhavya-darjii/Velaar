/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { extractTextFromPDF } from "../../services/pdfService";
import { generateLectureRoadmap, setAiContextCourse, parseSyllabusFromText } from "../../services/aiService";
import GlassSelect from "../../components/shared/GlassSelect";
import SegmentedToggle from "../../components/shared/SegmentedToggle";
import "./CourseGeneratorPage.css";

const DRAFT_STORAGE_KEY = "velaar_course_generator_draft";

// Global queue to ensure sequential PDF OCR extraction across all modules smoothly
let pdfExtractionQueue = Promise.resolve();

// --- HELPER: SCHEDULING LOGIC ---
const mapLecturesToSchedule = (
  roadmap,
  startDateStr,
  endDateStr,
  weeklySchedule,
) => {
  if (!startDateStr || Object.keys(weeklySchedule).length === 0) return roadmap;

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let currentDate = new Date(startDateStr);
  const endDateObj = endDateStr ? new Date(endDateStr) : null;

  let lectureIndex = 0;
  const scheduledRoadmap = [];
  let safetyCounter = 0;

  // Indian National Holidays
  const HOLIDAYS = [
    "01-26", // Republic Day
    "08-15", // Independence Day
    "10-02", // Gandhi Jayanti
    "12-25", // Christmas
    "01-01", // New Year
    "05-01", // Labour Day
  ];

  while (lectureIndex < roadmap.length && safetyCounter < 365) {
    if (endDateObj && currentDate > endDateObj) break;

    // Skip holidays
    const monthDay = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    if (HOLIDAYS.includes(monthDay)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayName = daysOfWeek[currentDate.getDay()];
    const timeSlots = weeklySchedule[dayName] || [];

    timeSlots.sort((a, b) => {
      const dateA = new Date("1970/01/01 " + a);
      const dateB = new Date("1970/01/01 " + b);
      return dateA - dateB;
    });

    if (timeSlots.length > 0) {
      for (const time of timeSlots) {
        if (lectureIndex >= roadmap.length) break;

        const lecture = roadmap[lectureIndex];
        const dateString = currentDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        scheduledRoadmap.push({
          ...lecture,
          date: dateString,
          time: time,
          fullIsoDate: new Date(
            currentDate.toDateString() + " " + time,
          ).toISOString(),
        });

        lectureIndex++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
    safetyCounter++;
  }

  while (lectureIndex < roadmap.length) {
    scheduledRoadmap.push(roadmap[lectureIndex]);
    lectureIndex++;
  }

  return scheduledRoadmap;
};

// Syllabus parsing multi-stage definitions (matches PPT generation progression)
const PARSE_STEPS = [
  { label: "Reading & Tokenizing Syllabus Document...", duration: 3500 },
  { label: "Mapping Course Outcomes (CO1–CO6)...", duration: 4500 },
  { label: "Analyzing Lecture Hours & Textbooks...", duration: 5500 },
  { label: "Structuring Modules & Curriculum Topics...", duration: 6500 },
];

const CourseGenerator = () => {
  const navigate = useNavigate();

  // Load persisted draft if available
  const savedDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [step, setStep] = useState(() => savedDraft?.step ?? 0); // 0: Syllabus Intake, 1: Course Architecture & Schedule, 2: Preview & Confirm
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [costInfo, setCostInfo] = useState(null);

  // Basic Form Data
  const [subjectName, setSubjectName] = useState(() => savedDraft?.subjectName || "");
  const [courseCode, setCourseCode] = useState(() => savedDraft?.courseCode || "");
  const [department, setDepartment] = useState(() => savedDraft?.department || "");
  const [program, setProgram] = useState(() => savedDraft?.program || "");
  const [semester, setSemester] = useState(() => savedDraft?.semester || "");
  const [totalLectures, setTotalLectures] = useState(() => savedDraft?.totalLectures ?? 20);
  const [startDate, setStartDate] = useState(() => savedDraft?.startDate || "");
  const [endDate, setEndDate] = useState(() => savedDraft?.endDate || "");

  // Syllabus Specific Data
  const [credits, setCredits] = useState(() => savedDraft?.credits || { theory: 3, practical: 0, tutorial: 0 });
  const [prerequisites, setPrerequisites] = useState(() => savedDraft?.prerequisites || []);
  const [prerequisitesHours, setPrerequisitesHours] = useState(() => savedDraft?.prerequisitesHours || 0);
  const [conclusionSection, setConclusionSection] = useState(() => savedDraft?.conclusionSection || null);
  const [courseObjectives, setCourseObjectives] = useState(() => savedDraft?.courseObjectives || []);
  const [courseOutcomes, setCourseOutcomes] = useState(() => savedDraft?.courseOutcomes || []);
  const [totalHoursTheory, setTotalHoursTheory] = useState(() => savedDraft?.totalHoursTheory || 0);
  const [textBooks, setTextBooks] = useState(() => savedDraft?.textBooks || []);
  const [referenceBooks, setReferenceBooks] = useState(() => savedDraft?.referenceBooks || []);
  const [usefulLinks, setUsefulLinks] = useState(() => savedDraft?.usefulLinks || []);
  const [syllabusRawText, setSyllabusRawText] = useState(() => savedDraft?.syllabusRawText || "");
  const [syllabusParseStatus, setSyllabusParseStatus] = useState(() => {
    if (savedDraft?.syllabusParseStatus === "done") return "done";
    return "idle";
  }); // idle | extracting | parsing | done | error
  const [syllabusParseError, setSyllabusParseError] = useState("");
  const [syllabusMode, setSyllabusMode] = useState(() => savedDraft?.syllabusMode || "upload"); // upload | paste
  const [pastedSyllabusText, setPastedSyllabusText] = useState(() => savedDraft?.pastedSyllabusText || "");
  const [isDragOver, setIsDragOver] = useState(false);
  const syllabusFileInputRef = useRef(null);

  // Live timer & multi-step progress for syllabus parsing (matches PPT generation panel)
  const [parseTimer, setParseTimer] = useState(0);
  const [parseProgress, setParseProgress] = useState(10);
  const [parseStepIndex, setParseStepIndex] = useState(0);
  // Controls the two-phase transition: parsing -> completing -> done
  const [parseCompleted, setParseCompleted] = useState(false);
  const [parseFadingOut, setParseFadingOut] = useState(false);
  // Ref so applyParsedSyllabus can kill the interval the instant the API responds
  const parseProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let timerInterval;
    let progressInterval;
    const timers = [];
    let completed = false; // flag to stop interval from overwriting 100%

    if (syllabusParseStatus === "parsing") {
      setParseTimer(0);
      setParseProgress(4);
      setParseStepIndex(0);
      setParseFadingOut(false);
      completed = false;

      const totalDuration = PARSE_STEPS.reduce((a, s) => a + s.duration, 0);
      let elapsed = 0;

      // Schedule step switches naturally based on step durations
      PARSE_STEPS.forEach((step, i) => {
        const t = setTimeout(() => setParseStepIndex(i), elapsed);
        timers.push(t);
        elapsed += step.duration;
      });

      // 1-second interval for clock display
      timerInterval = setInterval(() => {
        setParseTimer((prev) => prev + 1);
      }, 1000);

      // Smooth progress update every 150ms — stops immediately if completed
      let progressElapsed = 0;
      progressInterval = setInterval(() => {
        if (completed) {
          clearInterval(progressInterval);
          parseProgressIntervalRef.current = null;
          return;
        }
        progressElapsed += 150;
        if (progressElapsed <= totalDuration) {
          setParseProgress(Math.min(92, Math.round((progressElapsed / totalDuration) * 100)));
        } else {
          // Asymptotically creep from 92% up to 96% smoothly while waiting for Gemini
          const extra = progressElapsed - totalDuration;
          const slowGrowth = Math.min(96, Math.round(92 + 4 * (1 - Math.exp(-extra / 12000))));
          setParseProgress(slowGrowth);
        }
      }, 150);
      parseProgressIntervalRef.current = progressInterval;
    } else if (syllabusParseStatus === "done") {
      completed = true; // signal any still-running interval to stop
    } else {
      setParseTimer(0);
      setParseProgress(0);
      setParseStepIndex(0);
      setParseFadingOut(false);
    }

    return () => {
      completed = true; // always signal cleanup
      timers.forEach(clearTimeout);
      clearInterval(timerInterval);
      clearInterval(progressInterval);
      parseProgressIntervalRef.current = null;
    };
  }, [syllabusParseStatus]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Accordion UI state
  const [openAccordions, setOpenAccordions] = useState({
    prerequisites: false,
    objectives: false,
    outcomes: true,
    books: false,
    conclusion: false,
    subtopics: {},
  });

  const toggleAccordion = (section) => {
    setOpenAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleSubtopicAccordion = (modId) => {
    setOpenAccordions((prev) => ({
      ...prev,
      subtopics: { ...prev.subtopics, [modId]: !prev.subtopics[modId] },
    }));
  };

  // Divisions Data
  const [numDivisions, setNumDivisions] = useState(() => savedDraft?.numDivisions || 1);
  const [divisionsList, setDivisionsList] = useState(() => savedDraft?.divisionsList || ["A"]);

  // Module Data
  const [numModules, setNumModules] = useState(() => savedDraft?.numModules || 1);
  const [modules, setModules] = useState(() => {
    if (savedDraft?.modules && Array.isArray(savedDraft.modules) && savedDraft.modules.length > 0) {
      return savedDraft.modules;
    }
    return [
      { id: 1, name: "", extractedText: "", moduleLabel: "1", coMapped: null, hoursPerModule: 0 },
    ];
  });

  // Schedule State (Nested by Division: { "A": { "Mon": ["10:00 AM"] }, "B": {...} })
  const [weeklySchedule, setWeeklySchedule] = useState(() => savedDraft?.weeklySchedule || { A: {} });
  const [activeDivision, setActiveDivision] = useState(() => savedDraft?.activeDivision || "A");
  const [activeDay, setActiveDay] = useState("Mon");

  // Preview State
  const [previewDivision, setPreviewDivision] = useState(() => savedDraft?.previewDivision || "A");

  // Time Picker State
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  // Roadmap object containing arrays for each division
  const [generatedRoadmap, setGeneratedRoadmap] = useState(() => savedDraft?.generatedRoadmap || {});

  // Validation / Error Modal State
  const [validationError, setValidationError] = useState(null);

  // --- SYLLABUS APPLICATION HELPER ---
  // Cleans up PDF extraction artifact where letters are spaced: "H u f f m a n" -> "Huffman"
  const cleanPdfText = (text: string): string => {
    if (!text) return text;
    return text.replace(/(?<![\w])([A-Za-z] ){3,}[A-Za-z](?![\w])/g, (match) => match.replace(/ /g, ''));
  };

  const applyParsedSyllabus = (p, rawText = "") => {
    if (!p) return;
    if (p.subjectName) setSubjectName(p.subjectName);
    if (p.courseCode) setCourseCode(p.courseCode);
    if (p.credits) setCredits(p.credits);
    if (p.prerequisites && Array.isArray(p.prerequisites)) setPrerequisites(p.prerequisites.map(cleanPdfText));
    if (p.prerequisitesHours) setPrerequisitesHours(Number(p.prerequisitesHours) || 0);
    if (p.conclusion && p.conclusion.syllabusText) setConclusionSection(p.conclusion);
    if (p.courseObjectives && Array.isArray(p.courseObjectives)) setCourseObjectives(p.courseObjectives.map(cleanPdfText));
    if (p.courseOutcomes && Array.isArray(p.courseOutcomes)) setCourseOutcomes(
      p.courseOutcomes.map((c) => ({ ...c, description: cleanPdfText(c.description) }))
    );
    if (p.totalHoursTheory) {
      setTotalHoursTheory(p.totalHoursTheory);
      setTotalLectures(p.totalHoursTheory);
    }
    if (p.textBooks && Array.isArray(p.textBooks)) setTextBooks(p.textBooks);
    if (p.referenceBooks && Array.isArray(p.referenceBooks)) setReferenceBooks(p.referenceBooks);
    if (p.usefulLinks && Array.isArray(p.usefulLinks)) setUsefulLinks(p.usefulLinks);

    if (p.modules && p.modules.length > 0) {
      const parsedModules = p.modules.map((m, i) => ({
        id: i + 1,
        moduleLabel: m.moduleLabel || String(i + 1),
        name: m.name || `Module ${i + 1}`,
        extractedText: m.syllabusText || "",
        coMapped: m.coMapped || null,
        hoursPerModule: m.hoursPerModule || 0,
        fileStatus: "success",
        filesList: [],
        extractionProgress: "",
      }));
      setModules(parsedModules);
      setNumModules(parsedModules.length);
    }
    if (rawText) setSyllabusRawText(rawText);

    // Kill the progress interval immediately — prevents it from overwriting 100% on its next tick
    if (parseProgressIntervalRef.current) {
      clearInterval(parseProgressIntervalRef.current);
      parseProgressIntervalRef.current = null;
    }
    // Smooth & quick completion sweep to 100%
    setParseProgress(100);
    setParseCompleted(true);
    setParseStepIndex(PARSE_STEPS.length - 1);

    // Hold at 100% so user clearly sees the completed progress bar & confirmation
    setTimeout(() => {
      setParseFadingOut(true);
      setTimeout(() => {
        setSyllabusParseStatus("done");
        setParseFadingOut(false);
        setParseCompleted(false);
      }, 500);
    }, 550);
  };

  // --- SYLLABUS UPLOAD HANDLER ---
  const handleSyllabusUpload = async (file) => {
    if (!file) return;
    setSyllabusParseStatus("extracting");
    setSyllabusParseError("");
    try {
      const rawText = await extractTextFromPDF(file, () => { });
      if (!rawText) throw new Error("No readable text found in PDF.");
      setSyllabusRawText(rawText);
      setSyllabusParseStatus("parsing");
      const result = await parseSyllabusFromText(rawText);
      if (result.error) throw new Error(result.error);
      applyParsedSyllabus(result.parsed, rawText);
    } catch (err) {
      console.error("Syllabus parse error:", err);
      setSyllabusParseError(err.message || "Failed to parse syllabus document.");
      setSyllabusParseStatus("error");
    }
  };

  // --- SYLLABUS TEXT PARSE HANDLER ---
  const handlePasteParse = async () => {
    if (!pastedSyllabusText || pastedSyllabusText.trim().length < 50) {
      setSyllabusParseError("Please paste at least 50 characters of syllabus text.");
      setSyllabusParseStatus("error");
      return;
    }
    setSyllabusParseStatus("parsing");
    setSyllabusParseError("");
    try {
      const result = await parseSyllabusFromText(pastedSyllabusText);
      if (result.error) throw new Error(result.error);
      applyParsedSyllabus(result.parsed, pastedSyllabusText);
    } catch (err) {
      console.error("Paste parse error:", err);
      setSyllabusParseError(err.message || "Failed to parse syllabus text.");
      setSyllabusParseStatus("error");
    }
  };

  // --- DRAG & DROP FOR PDF ---
  const handleSyllabusDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      handleSyllabusUpload(file);
    } else {
      setSyllabusParseError("Please drop a valid PDF file.");
      setSyllabusParseStatus("error");
    }
  };

  // --- LIFECYCLE GUARDS: PREVENT UNINTENDED RELOAD/EXIT ---
  useEffect(() => {
    const hasUnsavedWork =
      syllabusParseStatus === "done" ||
      syllabusParseStatus === "extracting" ||
      syllabusParseStatus === "parsing" ||
      step > 0 ||
      Boolean(subjectName && subjectName.trim().length > 0) ||
      Boolean(courseCode && courseCode.trim().length > 0) ||
      Boolean(syllabusRawText && syllabusRawText.trim().length > 0) ||
      Boolean(pastedSyllabusText && pastedSyllabusText.trim().length > 0) ||
      modules.some((m) => m.name || m.extractedText || m.fileStatus === "loading");

    const handleBeforeUnload = (e) => {
      if (hasUnsavedWork) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    syllabusParseStatus,
    step,
    subjectName,
    courseCode,
    syllabusRawText,
    pastedSyllabusText,
    modules,
  ]);

  // --- AUTO-SAVE DRAFT TO LOCALSTORAGE ---
  useEffect(() => {
    const hasContent =
      subjectName ||
      courseCode ||
      syllabusRawText ||
      syllabusParseStatus === "done" ||
      step > 0 ||
      modules.some((m) => m.name || m.extractedText);

    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      try {
        const draftData = {
          step,
          subjectName,
          courseCode,
          department,
          program,
          semester,
          totalLectures,
          startDate,
          endDate,
          credits,
          prerequisites,
          prerequisitesHours,
          conclusionSection,
          courseObjectives,
          courseOutcomes,
          totalHoursTheory,
          textBooks,
          referenceBooks,
          usefulLinks,
          syllabusRawText,
          syllabusParseStatus,
          syllabusMode,
          pastedSyllabusText,
          numDivisions,
          divisionsList,
          numModules,
          modules: modules.map((m) => ({
            id: m.id,
            name: m.name || "",
            extractedText: m.extractedText || "",
            moduleLabel: m.moduleLabel || String(m.id),
            coMapped: m.coMapped || null,
            hoursPerModule: m.hoursPerModule || 0,
            fileStatus: m.fileStatus || "idle",
            filesList: (m.filesList || []).map((f) => ({ name: f.name, text: f.text, status: f.status })),
          })),
          weeklySchedule,
          activeDivision,
          previewDivision,
          generatedRoadmap,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch (err) {
        console.warn("Failed to persist course generator draft:", err);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    step,
    subjectName,
    courseCode,
    department,
    program,
    semester,
    totalLectures,
    startDate,
    endDate,
    credits,
    prerequisites,
    prerequisitesHours,
    conclusionSection,
    courseObjectives,
    courseOutcomes,
    totalHoursTheory,
    textBooks,
    referenceBooks,
    usefulLinks,
    syllabusRawText,
    syllabusParseStatus,
    syllabusMode,
    pastedSyllabusText,
    numDivisions,
    divisionsList,
    numModules,
    modules,
    weeklySchedule,
    activeDivision,
    previewDivision,
    generatedRoadmap,
  ]);

  // --- DIVISION HANDLERS ---
  const handleNumDivisionsChange = (e) => {
    const cleanValue = e.target.value.replace(/\D/g, "");
    if (cleanValue === "") {
      setNumDivisions("");
      return;
    }

    let val = parseInt(cleanValue, 10);
    if (val > 10) val = 10;
    if (val < 1) val = 1;

    setNumDivisions(val);

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const newDivs = [];
    const newSchedule = { ...weeklySchedule };

    for (let i = 0; i < val; i++) {
      const divName = letters[i];
      newDivs.push(divName);
      if (!newSchedule[divName]) {
        newSchedule[divName] = {};
      }
    }

    setDivisionsList(newDivs);
    setWeeklySchedule(newSchedule);

    if (!newDivs.includes(activeDivision) && newDivs.length > 0) {
      setActiveDivision(newDivs[0]);
    }
  };

  // --- MODULE HANDLERS ---
  const handleNumModulesChange = (e) => {
    const cleanValue = e.target.value.replace(/\D/g, "");
    if (cleanValue === "") {
      setNumModules("");
      return;
    }
    let val = parseInt(cleanValue, 10);
    if (val > 15) val = 15;
    if (val < 1) val = 1;

    setNumModules(val);

    setModules((prev) => {
      const newModules = [...prev];
      if (val > prev.length) {
        for (let i = prev.length; i < val; i++) {
          newModules.push({
            id: i + 1,
            moduleLabel: String(i + 1),
            name: "",
            extractedText: "",
            coMapped: null,
            hoursPerModule: 0,
          });
        }
      } else if (val < prev.length) {
        newModules.splice(val);
      }
      return newModules;
    });
  };

  const handleModuleNameChange = (index, name) => {
    const newModules = [...modules];
    newModules[index].name = name;
    setModules(newModules);
  };

  const handleModuleTextChange = (index, text) => {
    const newModules = [...modules];
    newModules[index].extractedText = text;
    setModules(newModules);
  };

  const handleModuleFilesChange = async (index, e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    const newFiles = rawFiles.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      fileObj: f,
      name: f.name,
      text: "",
      status: "loading"
    }));

    setModules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index] };
      next[index].filesList = [...(next[index].filesList || []), ...newFiles];
      next[index].fileStatus = "loading";
      next[index].extractionProgress = "Waiting in queue...";
      return next;
    });

    pdfExtractionQueue = pdfExtractionQueue.then(async () => {
      setModules((prev) => {
        const next = [...prev];
        next[index] = { ...next[index] };
        next[index].extractionProgress = `Extracting PDFs for Module ${index + 1}...`;
        return next;
      });

      for (let fi = 0; fi < newFiles.length; fi++) {
        const fileItem = newFiles[fi];
        try {
          const text = await extractTextFromPDF(fileItem.fileObj, (status) => {
            setModules((prev) => {
              const nx = [...prev];
              nx[index] = { ...nx[index] };
              nx[index].extractionProgress = `${fileItem.name}: ${status}`;
              return nx;
            });
          });

          if (text) {
            setModules(prev => {
              const nx = [...prev];
              nx[index] = { ...nx[index] };
              const fList = nx[index].filesList.map(f => f.id === fileItem.id ? { ...f, text, status: "success" } : f);
              nx[index].filesList = fList;
              return nx;
            });
          }
        } catch (fileErr) {
          console.error(`Failed to extract ${fileItem.name}:`, fileErr);
          setModules(prev => {
            const nx = [...prev];
            nx[index] = { ...nx[index] };
            const fList = nx[index].filesList.map(f => f.id === fileItem.id ? { ...f, status: "error" } : f);
            nx[index].filesList = fList;
            return nx;
          });
        }
      }

      setModules((prev) => {
        const nx = [...prev];
        nx[index] = { ...nx[index] };
        const fList = nx[index].filesList || [];
        const hasError = fList.some(f => f.status === "error");

        // Append additional extracted PDF text to any existing syllabus text
        const extraText = fList.filter(f => f.status === "success").map(f => f.text).join("\n\n");
        nx[index].extractedText = nx[index].extractedText
          ? `${nx[index].extractedText}\n\n--- Supplementary Notes ---\n\n${extraText}`
          : extraText;
        nx[index].fileStatus = hasError ? "error" : "success";
        nx[index].extractionProgress = "";
        return nx;
      });
    });

    e.target.value = null; // Reset input field
  };

  const removeFile = (moduleIndex, fileId) => {
    setModules(prev => {
      const next = [...prev];
      next[moduleIndex] = { ...next[moduleIndex] };
      const filteredList = (next[moduleIndex].filesList || []).filter(f => f.id !== fileId);
      next[moduleIndex].filesList = filteredList;

      if (filteredList.length === 0) {
        next[moduleIndex].fileStatus = next[moduleIndex].extractedText ? "success" : null;
      } else {
        const hasError = filteredList.some(f => f.status === "error");
        const allSuccess = filteredList.every(f => f.status === "success");
        if (hasError) next[moduleIndex].fileStatus = "error";
        else if (allSuccess) next[moduleIndex].fileStatus = "success";
      }
      return next;
    });
  };

  const handleDragStart = (e, moduleIndex, fileIndex) => {
    e.dataTransfer.setData('moduleIndex', moduleIndex);
    e.dataTransfer.setData('sourceIndex', fileIndex);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e, targetModuleIndex, targetFileIndex) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const sourceModuleIndex = parseInt(e.dataTransfer.getData('moduleIndex'), 10);
    const sourceFileIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);

    if (sourceModuleIndex !== targetModuleIndex || sourceFileIndex === targetFileIndex) return;

    setModules(prev => {
      const next = [...prev];
      const targetModule = { ...next[targetModuleIndex] };
      const list = [...(targetModule.filesList || [])];

      const [movedFile] = list.splice(sourceFileIndex, 1);
      list.splice(targetFileIndex, 0, movedFile);

      targetModule.filesList = list;
      next[targetModuleIndex] = targetModule;
      return next;
    });
  };

  // --- SCHEDULE HANDLERS ---
  const addTimeSlot = () => {
    const timeString = `${hour}:${minute} ${ampm}`;
    setWeeklySchedule((prev) => {
      const divSchedule = prev[activeDivision] || {};
      const currentSlots = divSchedule[activeDay] || [];
      if (currentSlots.includes(timeString)) return prev;

      return {
        ...prev,
        [activeDivision]: {
          ...divSchedule,
          [activeDay]: [...currentSlots, timeString],
        },
      };
    });
  };

  const removeTimeSlot = (day, timeToRemove) => {
    setWeeklySchedule((prev) => {
      const divSchedule = prev[activeDivision] || {};
      const updatedSlots = (divSchedule[day] || []).filter(
        (t) => t !== timeToRemove,
      );

      const newDivSchedule = { ...divSchedule, [day]: updatedSlots };
      if (updatedSlots.length === 0) delete newDivSchedule[day];

      return {
        ...prev,
        [activeDivision]: newDivSchedule,
      };
    });
  };

  // --- GENERATE ROADMAP ---
  const handleGenerate = async () => {
    if (!totalLectures) return setValidationError("Please specify total lectures.");

    const missingNames = modules.some((m) => !m.name.trim());
    if (missingNames) {
      return setValidationError("Please enter a name for all modules.");
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return setValidationError("Start Date cannot be after End Date.");
    }

    const unextractedModules = modules.some((m) => !m.extractedText?.trim() || m.fileStatus === "loading" || m.fileStatus === "error");
    if (unextractedModules) {
      return setValidationError("We're still processing your files! Please ensure all module texts/PDFs are successfully extracted.");
    }

    setLoading(true);
    setLoadingStatus("Velaar AI is architecting your course roadmap...");

    // Build rich, structured syllabus context preserving every subtopic
    const aggregatedSyllabusText = modules
      .map(
        (m) =>
          `MODULE ${m.moduleLabel || m.id}: ${m.name} [CO Mapped: ${m.coMapped || "None"}] [Target Hours: ${m.hoursPerModule || "N/A"}]\nSubtopics:\n${m.extractedText || "No syllabus text provided for this module."}`,
      )
      .join("\n\n---\n\n");

    try {
      setAiContextCourse("", subjectName);
      const acceptedModulesList = modules.map((m) => m.name).join(", ");
      const { roadmap, usage } = await generateLectureRoadmap(
        aggregatedSyllabusText,
        Number(totalLectures),
        acceptedModulesList
      );

      // Map module metadata (coMapped, moduleLabel, hours) onto each lecture
      if (Array.isArray(roadmap)) {
        roadmap.forEach((lec) => {
          const matched = modules.find(
            (m) => (m.name || "").trim().toLowerCase() === (lec.moduleName || "").trim().toLowerCase()
          );
          if (matched) {
            if (!lec.coMapped && matched.coMapped) lec.coMapped = matched.coMapped;
            lec.moduleLabel = matched.moduleLabel || String(matched.id);
            lec.moduleHours = matched.hoursPerModule || null;
          }
        });
      }

      if (usage) {
        const costUSD =
          (usage.input / 1000000) * 0.1 + (usage.output / 1000000) * 0.4;
        const costPaisa = (costUSD * 83 * 100).toFixed(4);

        console.log(
          "%c--- AI GENERATION BILLING REPORT ---",
          "color: #ffffff; font-weight: bold; font-size: 12px;",
        );
        console.table({
          "Input Tokens": usage.input,
          "Output Tokens": usage.output,
          "Total Paisa": `${costPaisa} p`,
        });
        setCostInfo(costPaisa);
      }

      // Map generated lectures to each division's specific timetable
      const multiDivisionRoadmap = {};
      divisionsList.forEach((div) => {
        multiDivisionRoadmap[div] = mapLecturesToSchedule(
          roadmap,
          startDate,
          endDate,
          weeklySchedule[div] || {},
        );
      });

      setGeneratedRoadmap(multiDivisionRoadmap);
      setPreviewDivision(divisionsList[0]);
      setStep(2);
    } catch (err) {
      console.error("AI Generation Failed:", err);
      setValidationError("AI Generation Failed: " + err.message);
    }
    setLoading(false);
    setLoadingStatus("");
  };

  // --- SAVE TO SUPABASE ---
  const handleSaveCourse = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return setValidationError("You must be logged in to save courses.");

    setLoading(true);
    setLoadingStatus("Saving course backbone & syllabus metadata to cloud...");

    try {
      const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single();
      const resolvedCollegeId = userProfile?.institution_id || null;

      const modulesToSave = modules.map((m) => ({
        id: m.id,
        moduleLabel: m.moduleLabel || String(m.id),
        name: m.name,
        extractedText: m.extractedText || "",
        coMapped: m.coMapped || null,
        hoursPerModule: m.hoursPerModule || 0,
      }));

      const courseData = {
        teacher_id: user.id,
        institution_id: resolvedCollegeId,
        code: courseCode || null,
        department,
        program,
        semester: semester !== "" ? Number(parseInt(semester, 10)) : null,
        name: subjectName,
        subject_name: subjectName,
        total_lectures: Number(totalLectures),
        divisions: divisionsList,
        weekly_schedule: weeklySchedule,
        start_date: startDate,
        end_date: endDate,
        modules: modulesToSave,
        roadmap: generatedRoadmap,
        lesson_plan: {
          courseCode: courseCode || "",
          subjectName: subjectName || "",
          credits: credits || { theory: 3, practical: 0, tutorial: 0 },
          prerequisites: prerequisites || [],
          prerequisitesHours: prerequisitesHours || 0,
          courseObjectives: courseObjectives || [],
          courseOutcomes: courseOutcomes || [],
          conclusionSection: conclusionSection || null,
          textBooks: textBooks || [],
          referenceBooks: referenceBooks || [],
          usefulLinks: usefulLinks || [],
          totalHoursTheory: totalHoursTheory || Number(totalLectures) || 0,
          rawSyllabusText: syllabusRawText || ""
        }
      };

      const { data, error } = await supabase.from("courses").insert(courseData).select().single();

      if (error) throw error;

      console.log("Course saved successfully with ID: ", data.id);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate("/teacher");
    } catch (err) {
      console.error("Cloud Save Failed:", err);
      setValidationError("Cloud Save Failed: " + err.message);
    }
    setLoading(false);
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      {loading && (
        <div className="generation-modal" style={{ background: 'rgba(10, 15, 30, 0.75)', backdropFilter: 'blur(20px)' }}>
          <div className="modal-content" style={{
            border: '1px solid rgba(255, 255, 255, 0.15)',
            minWidth: '320px',
            maxWidth: '420px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner-large" style={{ color: '#ffffff', marginBottom: '20px' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', marginBottom: '8px' }}>Architecting Course...</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem', lineHeight: '1.6' }}>
              {loadingStatus || "Processing..."}
            </p>
          </div>
        </div>
      )}

      <div className="lesson-plan-container" style={{ padding: '20px' }}>
        <div className="lesson-plan-grid glass" style={{ maxWidth: '1050px', margin: '0 auto', width: '100%', padding: '40px' }}>

          {/* STEPPER BAR */}
          <div className="stepper-bar">
            <div
              className={`step-item ${step === 0 ? "active" : "done clickable"}`}
              onClick={() => step > 0 && setStep(0)}
            >
              <span className="step-num">1</span>
              <span>Syllabus Intake</span>
            </div>
            <div className="step-divider" />
            <div
              className={`step-item ${step === 1 ? "active" : step > 1 ? "done clickable" : ""}`}
              onClick={() => step > 1 && setStep(1)}
            >
              <span className="step-num">2</span>
              <span>Architecture & Schedule</span>
            </div>
            <div className="step-divider" />
            <div className={`step-item ${step === 2 ? "active" : ""}`}>
              <span className="step-num">3</span>
              <span>Roadmap Preview</span>
            </div>
          </div>

          <div className="exams-header" style={{ marginBottom: "25px", textAlign: "center" }}>
            <h2 style={{ color: '#ffffff', margin: 0, fontSize: '2.1rem', fontWeight: 900 }}>
              {step === 0 && "Syllabus Intake & AI Ingestion"}
              {step === 1 && "Course Architecture & Schedule"}
              {step === 2 && "Course Roadmap Preview"}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '8px 0 0 0', fontSize: '0.95rem' }}>
              {step === 0 && "Upload your official syllabus document to auto-architect the entire subject backbone."}
              {step === 1 && "Review pre-filled metadata, customize course modules, and configure weekly timetable."}
              {step === 2 && "Review AI-generated lecture sequence with mapped Course Outcomes before saving."}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* STEP 0: SYLLABUS INTAKE HERO                                              */}
          {/* ========================================================================= */}
          {step === 0 && (
            <>
              <div className="syllabus-hero-card">
              <div className="ai-engine-tag">
                AI Syllabus Document Engine
              </div>

              <h2 className="syllabus-hero-title">Auto-Architect Course from Syllabus</h2>
              <p className="syllabus-hero-subtitle">
                Upload your official department syllabus PDF. Velaar AI extracts Course Code, Course Outcomes (COs), objectives, textbooks, credits, and structures all modules with curriculum topics.
              </p>

              {/* HIDDEN SYLLABUS PDF INPUT (ALWAYS IN DOM) */}
              <input 
                type="file" 
                ref={syllabusFileInputRef}
                id="syllabus-pdf-file-input"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleSyllabusUpload(file);
                  }
                  e.target.value = "";
                }}
              />

              {/* UPLOAD MODE */}
              {syllabusParseStatus !== "parsing" && syllabusParseStatus !== "extracting" && syllabusParseStatus !== "done" && (
                <div>
                  <div
                    className={`syllabus-dropzone ${isDragOver ? "drag-active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleSyllabusDrop}
                    onClick={() => syllabusFileInputRef.current?.click()}
                  >
                    <div className="dropzone-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 18v-6" />
                        <path d="m9 15 3-3 3 3" />
                      </svg>
                    </div>
                    <div className="dropzone-main-text">Click to browse or drag & drop syllabus PDF</div>
                    <div className="dropzone-sub-text">Supported: PDF </div>
                    <button
                      type="button"
                      className="glass-btn primary glass-btn-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        syllabusFileInputRef.current?.click();
                      }}
                    >
                      Browse PDF Documents
                    </button>
                  </div>
                </div>
              )}

              {/* STATUS: EXTRACTING PDF */}
              {syllabusParseStatus === "extracting" && (
                <div className="syllabus-processing-card">
                  <svg
                    width="48" height="48"
                    viewBox="0 0 24 24" fill="none" stroke="#ffffff"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="spinner-large"
                    style={{ margin: "0 auto 14px auto", display: "block" }}
                  >
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                  </svg>
                  <h3 style={{ color: "#ffffff", margin: "0 0 6px 0", fontSize: "1.1rem" }}>Extracting Text from PDF...</h3>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", margin: 0 }}>Reading structural document contents via Velaar PDF engine.</p>
                </div>
              )}

              {/* STATUS: PARSING SYLLABUS (also shown during completing & fade-out transition) */}
              {(syllabusParseStatus === "parsing" || parseFadingOut || parseCompleted) && (
                <div className={`syllabus-processing-card parsing-card${parseFadingOut ? " parsing-card--fading" : ""}`}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ffffff", letterSpacing: "0.01em" }}>
                      {parseCompleted || parseFadingOut ? "Syllabus Parsed Successfully!" : "Velaar AI is Parsing Your Syllabus..."}
                    </span>
                    <span className="ppt-progress-panel__timer">
                      {formatTime(parseTimer)}
                    </span>
                  </div>
                  <div className="ppt-progress-bar-track">
                    <div
                      className={`ppt-progress-bar-fill${parseCompleted ? " completing" : ""}`}
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "2px" }}>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.82rem", margin: 0, lineHeight: 1.45 }}>
                      {parseCompleted || parseFadingOut
                        ? "All modules, course outcomes, and curriculum topics structured!"
                        : (PARSE_STEPS[parseStepIndex]?.label || "Extracting course code, outcome mappings (CO1–CO6), and structuring modules.")}
                    </p>
                    <div className="ppt-progress-panel__steps">
                      {PARSE_STEPS.map((s, idx) => (
                        <span
                          key={idx}
                          className={`ppt-step-dot${
                            parseCompleted || parseFadingOut
                              ? " ppt-step-dot--done"
                              : idx === parseStepIndex
                              ? " ppt-step-dot--active"
                              : idx < parseStepIndex
                              ? " ppt-step-dot--done"
                              : ""
                          }`}
                          title={s.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STATUS: ERROR */}
              {syllabusParseStatus === "error" && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  maxWidth: '600px',
                  margin: '20px auto 0 auto',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem'
                }}>
                  <strong>Extraction Error:</strong> {syllabusParseError}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      className="glass-btn secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => setSyllabusParseStatus("idle")}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* STATUS: DONE (SUCCESS SUMMARY) */}
              {syllabusParseStatus === "done" && !parseFadingOut && (
                <div className="syllabus-success-card syllabus-success-card--fadein">
                  <div className="success-header-row">
                    <h3 className="success-title">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Syllabus Ingested Successfully
                    </h3>
                    <button
                      className="glass-btn primary"
                      style={{ padding: "6px 14px", fontSize: "0.8rem", background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 700 }}
                      onClick={() => {
                        syllabusFileInputRef.current?.click();
                      }}
                    >
                      Re-upload
                    </button>
                  </div>

                  <div className="summary-chips-grid">
                    <div className="summary-chip">
                      <div className="summary-chip-label">Course Code</div>
                      <div className="summary-chip-val">{courseCode || "N/A"}</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Subject Name</div>
                      <div className="summary-chip-val">{subjectName || "N/A"}</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Theory Hours</div>
                      <div className="summary-chip-val">{totalHoursTheory || totalLectures} Hours</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Modules</div>
                      <div className="summary-chip-val">{modules.length} Modules</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Outcomes Mapped</div>
                      <div className="summary-chip-val">{courseOutcomes.length} COs</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Textbooks</div>
                      <div className="summary-chip-val">{textBooks.length} Books</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Reference Books</div>
                      <div className="summary-chip-val">{referenceBooks.length} Books</div>
                    </div>
                    <div className="summary-chip">
                      <div className="summary-chip-label">Useful Links</div>
                      <div className="summary-chip-val">{usefulLinks.length} Links</div>
                    </div>
                    {/* CREDITS CHIP - COMMENTED OUT FOR NOW
                    <div className="summary-chip">
                      <div className="summary-chip-label">Credits</div>
                      <div className="summary-chip-val">TH: {credits?.theory || 0}</div>
                    </div>
                    */}
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                    <button
                      className="glass-btn primary"
                      style={{ padding: "12px 28px", alignItems: "center", fontSize: "0.95rem", background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 800 }}
                      onClick={() => setStep(1)}
                    >
                      Review Pre-filled Setup & Timetable →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* MANUAL SKIP LINK */}
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <button
                className="skip-syllabus-btn"
                onClick={() => setStep(1)}
              >
                Skip Syllabus Upload and Configure Manually
              </button>
            </div>
          </>
        )}

          {/* ========================================================================= */}
          {/* STEP 1: FORM CONTENT (PRE-FILLED OR MANUAL)                              */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="form-content">
              {/* TOP BANNER IF SYLLABUS ACTIVE */}
              {courseCode && (
                <div className="prefilled-banner">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="co-badge">{courseCode}</span>
                    <span><strong>{subjectName}</strong> — {totalLectures} Total Hours, {modules.length} Modules, {courseOutcomes.length} COs Mapped</span>
                  </div>
                  <button
                    className="glass-btn primary"
                    style={{ padding: "6px 16px", fontSize: "0.82rem", background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 700 }}
                    onClick={() => setStep(0)}
                  >
                    ← Back to Syllabus Intake
                  </button>
                </div>
              )}

              {/* LEFT COLUMN: BASIC INFO & METADATA */}
              <div className="form-section">
                <div className="row-inputs" style={{ gridTemplateColumns: "1fr 2fr", marginBottom: "15px" }}>
                  <div>
                    <label>Course Code</label>
                    <input
                      className="glass-input"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. AIC404"
                    />
                  </div>
                  <div>
                    <label>Subject Name</label>
                    <input
                      className="glass-input"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. AI Algorithms & Ethics"
                    />
                  </div>
                </div>

                {/* INSTITUTIONAL METADATA ROW */}
                <div
                  className="row-inputs"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: "15px", marginBottom: "15px" }}
                >
                  <div>
                    <label>Department</label>
                    <input
                      className="glass-input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Engineering"
                    />
                  </div>
                  <div>
                    <label>Program</label>
                    <input
                      className="glass-input"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      placeholder="e.g. B.Tech"
                    />
                  </div>
                  <div>
                    <label>Semester</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      className="glass-input"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="e.g. 4"
                    />
                  </div>
                </div>

                {/* ROW FOR LECTURES & DATES */}
                <div
                  className="row-inputs"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  <div>
                    <label>Total Lectures</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="glass-input"
                      value={totalLectures}
                      onChange={(e) => setTotalLectures(e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div>
                    <label>Sem Start</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Sem End</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* CREDITS DISPLAY - COMMENTED OUT FOR NOW
                <div style={{ marginTop: "15px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
                  <span>Credits Scheme:</span>
                  <span className="co-badge">Theory (TH): {credits?.theory ?? 3}</span>
                  <span className="hours-badge">Practical (PR): {credits?.practical ?? 0}</span>
                  <span className="module-label-badge">Tutorial (TUT): {credits?.tutorial ?? 0}</span>
                </div>
                */}

                {/* ACCORDION: COURSE OBJECTIVES */}
                {courseObjectives.length > 0 && (
                  <div className="glass-accordion">
                    <div className="accordion-header" onClick={() => toggleAccordion("objectives")}>
                      <span>Course Objectives ({courseObjectives.length})</span>
                      <span>{openAccordions.objectives ? "▲" : "▼"}</span>
                    </div>
                    {openAccordions.objectives && (
                      <div className="accordion-body">
                        <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
                          {courseObjectives.map((obj, idx) => (
                            <li key={idx} style={{ marginBottom: "4px" }}>{obj}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* ACCORDION: COURSE OUTCOMES (COs) */}
                {courseOutcomes.length > 0 && (
                  <div className="glass-accordion" style={{ marginTop: "8px" }}>
                    <div className="accordion-header" onClick={() => toggleAccordion("outcomes")}>
                      <span>Course Outcomes ({courseOutcomes.length} COs Mapped to Modules)</span>
                      <span>{openAccordions.outcomes ? "▲" : "▼"}</span>
                    </div>
                    {openAccordions.outcomes && (
                      <div className="accordion-body">
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {courseOutcomes.map((coItem, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "8px" }}>
                              <span className="co-badge" style={{ minWidth: "45px", textAlign: "center" }}>{coItem.co || `CO${idx + 1}`}</span>
                              <span style={{ fontSize: "0.86rem" }}>{coItem.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ACCORDION: PREREQUISITES */}
                {prerequisites.length > 0 && (
                  <div className="glass-accordion" style={{ marginTop: "8px" }}>
                    <div className="accordion-header" onClick={() => toggleAccordion("prerequisites")}>
                      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        Prerequisites
                        {prerequisitesHours > 0 && (
                          <span className="hours-badge">{prerequisitesHours} hrs</span>
                        )}
                      </span>
                      <span>{openAccordions.prerequisites ? "▲" : "▼"}</span>
                    </div>
                    {openAccordions.prerequisites && (
                      <div className="accordion-body">
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {prerequisites.map((req, idx) => (
                            <span key={idx} style={{ background: "rgba(255,255,255,0.08)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.86rem" }}>
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DYNAMIC MODULES SECTION */}
                <div className="input-group" style={{ marginTop: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ margin: 0 }}>Course Modules ({modules.length})</label>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                      Total Planned Hours: {totalHoursTheory || totalLectures} hrs
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="glass-input"
                    value={numModules}
                    onChange={handleNumModulesChange}
                    onFocus={(e) => e.target.select()}
                    style={{ marginTop: "8px" }}
                  />
                </div>

                <div
                  className="modules-container"
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  {modules.map((mod, index) => (
                    <div
                      key={mod.id}
                      className="module-box"
                      style={{
                        padding: "16px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.02)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="module-label-badge">
                            {mod.name?.trim()
                              ? (mod.name.toLowerCase().startsWith("module") ? mod.name : `Module ${mod.moduleLabel || index + 1}: ${mod.name}`)
                              : `Module ${mod.moduleLabel || index + 1}`}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {mod.coMapped && <span className="co-badge">{mod.coMapped}</span>}
                          {mod.hoursPerModule > 0 && <span className="hours-badge">{mod.hoursPerModule} Hours</span>}
                        </div>
                      </div>

                      <div className="input-group">
                        <input
                          className="glass-input"
                          value={mod.name}
                          onChange={(e) =>
                            handleModuleNameChange(index, e.target.value)
                          }
                          placeholder={`e.g. Module Title`}
                        />
                      </div>

                      {/* SYLLABUS TOPICS BOX */}
                      <div className="subtopics-preview">
                        <div
                          className="subtopics-label-row"
                          style={{ cursor: "pointer", userSelect: "none" }}
                          onClick={() => toggleSubtopicAccordion(mod.id)}
                        >
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>
                            Syllabus Subtopics
                          </span>
                          <span>{openAccordions.subtopics[mod.id] ? "Collapse ▲" : "View/Edit ▼"}</span>
                        </div>

                        {openAccordions.subtopics[mod.id] && (
                          <textarea
                            className="subtopics-textarea-view"
                            value={mod.extractedText || ""}
                            onChange={(e) => handleModuleTextChange(index, e.target.value)}
                            placeholder="Enter or paste syllabus topics for this module..."
                          />
                        )}
                      </div>

                      {/* OPTIONAL SUPPLEMENTARY PDF UPLOAD */}
                      <div className="input-group" style={{ marginTop: "12px" }}>
                        <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
                          Supplementary PDFs / Notes (Optional)
                        </label>
                        <div className="file-upload-wrapper">
                          <input
                            type="file"
                            accept="application/pdf"
                            multiple
                            onChange={(e) => handleModuleFilesChange(index, e)}
                            className="glass-file-input"
                          />

                          {(mod.filesList && mod.filesList.length > 0) && (
                            <div className="files-list" style={{ marginTop: '10px' }}>
                              {mod.filesList.map((file, fIndex) => (
                                <div
                                  key={file.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, index, fIndex)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, index, fIndex)}
                                  className="file-item-glass"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                    <span className="drag-handle">≡</span>
                                    <span className="file-name-span">{file.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {file.status === 'loading' && <span style={{ color: 'rgba(255,255,255,0.7)' }}>Extracting...</span>}
                                    {file.status === 'success' && <span style={{ color: '#ffffff' }}>✓</span>}
                                    <button
                                      className="remove-file-btn"
                                      onClick={() => removeFile(index, file.id)}
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONCLUSION SECTION — shown after all modules, not counted as a module */}
                {conclusionSection && conclusionSection.syllabusText && (
                  <div className="glass-accordion" style={{ marginTop: "20px" }}>
                    <div className="accordion-header" onClick={() => toggleAccordion("conclusion")}>
                      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {conclusionSection.name || "Conclusion"}
                        {conclusionSection.hoursPerModule > 0 && (
                          <span className="hours-badge">{conclusionSection.hoursPerModule} hrs</span>
                        )}
                      </span>
                      <span>{openAccordions.conclusion ? "▲" : "▼"}</span>
                    </div>
                    {openAccordions.conclusion && (
                      <div className="accordion-body" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                        {conclusionSection.syllabusText}
                      </div>
                    )}
                  </div>
                )}

                {/* ACCORDION: TEXTBOOKS & REFERENCES */}
                {(textBooks.length > 0 || referenceBooks.length > 0 || usefulLinks.length > 0) && (
                  <div className="glass-accordion" style={{ marginTop: "20px" }}>
                    <div className="accordion-header" onClick={() => toggleAccordion("books")}>
                      <span>Textbooks, References & Useful Links ({textBooks.length + referenceBooks.length} Books)</span>
                      <span>{openAccordions.books ? "▲" : "▼"}</span>
                    </div>
                    {openAccordions.books && (
                      <div className="accordion-body">
                        {textBooks.length > 0 && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", fontWeight: 700, marginBottom: "6px" }}>
                              Text Books:
                            </div>
                            <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
                              {textBooks.map((tb, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>{tb}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {referenceBooks.length > 0 && (
                          <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", fontWeight: 700, marginBottom: "6px" }}>
                              Reference Books:
                            </div>
                            <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
                              {referenceBooks.map((rb, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>{rb}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {usefulLinks.length > 0 && (
                          <div>
                            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", fontWeight: 700, marginBottom: "6px" }}>
                              Useful Links:
                            </div>
                            <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
                              {usefulLinks.map((link, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>
                                  <a href={link} target="_blank" rel="noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: ADVANCED SCHEDULER */}
              <div className="form-section scheduler-section">
                <h2 className="scheduler-title">Weekly Schedule Builder</h2>

                <div
                  className="input-group"
                  style={{ marginTop: "10px", marginBottom: "20px" }}
                >
                  <label style={{ fontSize: "0.9rem", color: "#ffffff" }}>
                    Number of Divisions to teach
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="glass-input"
                    value={numDivisions}
                    onChange={handleNumDivisionsChange}
                    onFocus={(e) => e.target.select()}
                    placeholder="e.g. 2"
                    style={{ maxWidth: "150px" }}
                  />
                </div>

                {/* DIVISION TOGGLE TABS */}
                {divisionsList.length > 0 && (
                  <div className="division-tabs">
                    {divisionsList.map((div) => (
                      <button
                        key={div}
                        className={`division-tab ${activeDivision === div ? "active" : ""}`}
                        onClick={() => setActiveDivision(div)}
                      >
                        Div {div}
                      </button>
                    ))}
                  </div>
                )}

                <p className="helper-text">
                  Select a day, add time slots for lectures in <strong>Division {activeDivision}</strong>
                </p>

                <div className="day-tabs">
                  {days.map((day) => {
                    const hasSlots =
                      weeklySchedule[activeDivision]?.[day]?.length > 0;
                    return (
                      <button
                        key={day}
                        className={`day-tab ${activeDay === day ? "active" : ""} ${hasSlots ? "has-slots" : ""}`}
                        onClick={() => setActiveDay(day)}
                      >
                        {day}
                        {hasSlots && <span className="dot"></span>}
                      </button>
                    );
                  })}
                </div>

                <div className="time-adder">
                  <span className="current-day-label">{activeDay}:</span>
                  <GlassSelect
                    className="time-select-glass"
                    value={hour}
                    onChange={setHour}
                    style={{ width: "75px" }}
                    options={[...Array(12).keys()].map((n) => ({
                      value: String(n + 1).padStart(2, "0"),
                      label: String(n + 1).padStart(2, "0"),
                    }))}
                  />
                  <span style={{ color: "white", fontWeight: "bold" }}>:</span>

                  <GlassSelect
                    className="time-select-glass"
                    value={minute}
                    onChange={setMinute}
                    style={{ width: "75px" }}
                    options={["00", "10", "20", "30", "40", "50"]}
                  />

                  <GlassSelect
                    className="time-select-glass"
                    value={ampm}
                    onChange={setAmpm}
                    style={{ width: "80px" }}
                    options={["AM", "PM"]}
                  />

                  <button className="add-time-btn" onClick={addTimeSlot}>
                    + Add
                  </button>
                </div>

                <div className="slots-display">
                  {!weeklySchedule[activeDivision] ||
                    Object.keys(weeklySchedule[activeDivision]).length === 0 ? (
                    <span className="empty-msg">
                      No times scheduled for Division {activeDivision} yet.
                    </span>
                  ) : (
                    Object.entries(weeklySchedule[activeDivision]).map(
                      ([day, times]) => (
                        <div key={day} className="day-slot-group">
                          <strong>{day}</strong>
                          <div className="pill-container">
                            {times.map((t) => (
                              <span key={t} className="time-pill">
                                {t}
                                <button onClick={() => removeTimeSlot(day, t)}>
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <button
                className="glass-btn primary"
                onClick={handleGenerate}
                disabled={loading}
                style={{ gridColumn: "1 / -1", marginTop: "20px", padding: "16px 28px", fontSize: "1.05rem", width: "100%", background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 800 }}
              >
                {loading ? "Velaar AI is Generating Roadmap..." : "Generate Lecture Roadmap"}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PREVIEW & CONFIRMATION                                            */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="preview-content">
              <div className="preview-header">
                <div>
                  <h2 style={{ color: '#ffffff', margin: 0 }}>Course Roadmap Preview</h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                    {courseCode ? `[${courseCode}] ` : ""}{subjectName}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="lecture-count">
                    {generatedRoadmap[previewDivision]?.length || 0} Lectures
                  </span>
                </div>
              </div>

              {/* PREVIEW DIVISION TOGGLE */}
              {divisionsList.length > 1 && (
                <div
                  className="division-tabs"
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                    justifyContent: "center",
                  }}
                >
                  {divisionsList.map((div) => (
                    <button
                      key={div}
                      className={`glass-btn ${previewDivision === div ? "primary" : "secondary"}`}
                      style={{ padding: "8px 20px" }}
                      onClick={() => setPreviewDivision(div)}
                    >
                      View Div {div} Roadmap
                    </button>
                  ))}
                </div>
              )}

              <div className="roadmap-scroll">
                {generatedRoadmap[previewDivision]?.map((lecture, idx) => (
                  <div key={idx} className="glass-list-item">
                    <div className="item-meta">
                      <span className="lecture-badge">#{lecture.lectureNum}</span>
                      {lecture.date && (
                        <span className="date-tag">{lecture.date}</span>
                      )}
                      {lecture.time && (
                        <span className="time-tag">{lecture.time}</span>
                      )}
                      {lecture.coMapped && (
                        <span className="co-badge" style={{ marginLeft: "8px" }}>
                          {lecture.coMapped}
                        </span>
                      )}
                      {lecture.moduleName && (
                        <span className="module-tag" style={{ marginLeft: "8px" }}>
                          {lecture.moduleName}
                        </span>
                      )}
                    </div>
                    <div className="item-content">
                      <h3 style={{ margin: "6px 0 8px 0" }}>{lecture.title}</h3>
                      {lecture.description && (
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: '0 0 10px 0' }}>
                          {lecture.description}
                        </p>
                      )}
                      <ul style={{ margin: 0, paddingLeft: "18px" }}>
                        {lecture.checklist?.map((pt, i) => (
                          <li key={i} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '3px' }}>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="action-row" style={{ marginTop: "25px" }}>
                <button
                  className="glass-btn primary"
                  style={{ background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 700, padding: "12px 24px" }}
                  onClick={() => setStep(1)}
                >
                  ← Edit Course Architecture
                </button>
                <button
                  className="glass-btn primary"
                  onClick={handleSaveCourse}
                  disabled={loading}
                  style={{ background: "#ffffff", color: "#000000", border: "1px solid #ffffff", fontWeight: 800, padding: "12px 24px" }}
                >
                  {loading ? "Saving Course..." : "Confirm & Save Course to Cloud"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ERROR / VALIDATION MODAL */}
      {validationError && (
        <div className="generation-modal" style={{ background: 'rgba(10, 15, 30, 0.75)', backdropFilter: 'blur(20px)' }}>
          <div className="modal-content" style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '320px',
            maxWidth: '420px',
            padding: '40px'
          }}>
            <div style={{ color: '#ffffff', marginBottom: '15px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Just a moment...</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              {validationError}
            </p>
            <button
              className="glass-btn primary"
              onClick={() => setValidationError(null)}
              style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseGenerator;
