import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { extractTextFromPDF } from "../services/pdfService";
import { generateLectureRoadmap } from "../services/aiService";
import "./CourseGenerator.css";

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

const CourseGenerator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [costInfo, setCostInfo] = useState(null);

  // Form Data
  const [subjectName, setSubjectName] = useState("");
  const [totalLectures, setTotalLectures] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Divisions Data
  const [numDivisions, setNumDivisions] = useState(1);
  const [divisionsList, setDivisionsList] = useState(["A"]);

  // Module Data
  const [numModules, setNumModules] = useState(1);
  const [modules, setModules] = useState([
    { id: 1, name: "", extractedText: "" },
  ]);

  // Schedule State (Nested by Division: { "A": { "Mon": ["10:00 AM"] }, "B": {...} })
  const [weeklySchedule, setWeeklySchedule] = useState({ A: {} });
  const [activeDivision, setActiveDivision] = useState("A");
  const [activeDay, setActiveDay] = useState("Mon");

  // Preview State
  const [previewDivision, setPreviewDivision] = useState("A");

  // Time Picker State
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  // Roadmap object containing arrays for each division
  const [generatedRoadmap, setGeneratedRoadmap] = useState({});

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
      // Intentionally avoiding setModules([]) to prevent wiping existing data 
      // when a user accidentally clears the input field.
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
          newModules.push({ id: i + 1, name: "", extractedText: "" });
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

  const handleModuleFilesChange = async (index, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setModules((prev) => {
      const next = [...prev];
      next[index].fileStatus = "loading";
      next[index].extractionProgress = "Waiting in queue...";
      return next;
    });

    pdfExtractionQueue = pdfExtractionQueue.then(async () => {
      setModules((prev) => {
        const next = [...prev];
        next[index].extractionProgress = `Extracting PDFs for Module ${index + 1}...`;
        return next;
      });

      try {
        let combinedText = "";
        let successCount = 0;
        let lastErr = null;

        for (const file of files) {
          try {
            const text = await extractTextFromPDF(file, (status) => {
              setModules((prev) => {
                const next = [...prev];
                next[index].extractionProgress = `Mod ${index + 1}: ${status}`;
                return next;
              });
            });
            if (text) {
               combinedText += text + "\n\n";
               successCount++;
            }
          } catch (fileErr) {
            console.error(`Failed to extract ${file.name}:`, fileErr);
            lastErr = fileErr;
          }
        }

        if (successCount === 0) {
          if (files.length === 1) {
            throw new Error(`Failed to extract text from the PDF. ${lastErr?.message || ""}`);
          } else {
            throw new Error(`Failed to extract text from all ${files.length} PDFs uploaded.`);
          }
        }

        setModules((prev) => {
          const next = [...prev];
          next[index].extractedText = combinedText;
          next[index].fileStatus = "success";
          next[index].extractionProgress = "";
          return next;
        });
      } catch (err) {
        console.error(err);
        alert(`Error reading PDFs for Module ${index + 1}: ` + err.message);
        
        setModules((prev) => {
          const next = [...prev];
          next[index].extractedText = "";
          next[index].fileStatus = "error";
          next[index].extractionProgress = "";
          return next;
        });
      }
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

  // --- GENERATE ---
  const handleGenerate = async () => {
    if (!totalLectures) return alert("Please specify total lectures.");

    const missingNames = modules.some((m) => !m.name.trim());
    if (missingNames) {
      return alert("Please enter a name for all modules.");
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return alert("Start Date cannot be after End Date.");
    }

    setLoading(true);
    setLoadingStatus("AI is architecting your course...");

    const aggregatedSyllabusText = modules
      .map(
        (m) =>
          `MODULE NAME: ${m.name}\n${m.extractedText || "No syllabus text provided for this module."}`,
      )
      .join("\n\n---\n\n");

    try {
      // 1. Ask AI to break syllabus into lectures (One time cost)
      const { roadmap, usage } = await generateLectureRoadmap(
        aggregatedSyllabusText,
        Number(totalLectures),
      );

      if (usage) {
        const costUSD =
          (usage.input / 1000000) * 0.1 + (usage.output / 1000000) * 0.4;
        const costPaisa = (costUSD * 83 * 100).toFixed(4);

        console.log(
          "%c--- 💰 GEMINI BILLING REPORT ---",
          "color: #00ffcc; font-weight: bold; font-size: 12px;",
        );
        console.table({
          "Input Tokens": usage.input,
          "Output Tokens": usage.output,
          "Total Paisa": `${costPaisa} p`,
        });
        setCostInfo(costPaisa);
      }

      // 2. Map the generated roadmap to EACH division's specific schedule
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
      alert("AI Generation Failed: " + err.message);
    }
    setLoading(false);
    setLoadingStatus("");
  };

  // --- SAVE ---
  const handleSaveCourse = async () => {
    if (!auth.currentUser) return alert("Not logged in");
    setLoading(true);
    setLoadingStatus("Saving to Cloud...");

    try {
      const modulesToSave = modules.map((m) => ({
        id: m.id,
        name: m.name,
      }));

      const docRef = await addDoc(collection(db, "courses"), {
        teacherId: auth.currentUser.uid,
        subjectName,
        totalLectures: Number(totalLectures),
        divisions: divisionsList,
        weeklySchedule,
        startDate,
        endDate,
        modules: modulesToSave,
        roadmap: generatedRoadmap,
        createdAt: new Date(),
      });

      console.log("Course saved successfully with ID: ", docRef.id);
      navigate("/teacher");
    } catch (err) {
      alert("Save failed: " + err.message);
    }
    setLoading(false);
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="glass-container" style={{ minHeight: 'auto', padding: '20px 0' }}>
      <div className="glass-card" style={{ margin: '0 auto' }}>
        <h1 className="glass-title">Create New Course</h1>

        {step === 1 && (
          <div className="form-content">
            {/* LEFT COLUMN: BASIC INFO */}
            <div className="form-section">
              <div className="input-group">
                <label>Subject Name</label>
                <input
                  className="glass-input"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Advanced Thermodynamics"
                />
              </div>

              {/* THREE COLUMN ROW FOR LECTURES & DATES (Divisions removed from here) */}
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

              {/* DYNAMIC MODULES SECTION */}
              <div className="input-group" style={{ marginTop: "20px" }}>
                <label>Number of Modules</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="glass-input"
                  value={numModules}
                  onChange={handleNumModulesChange}
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
                      padding: "15px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                    }}
                  >
                    <div className="input-group">
                      <label>Module {mod.id} Name</label>
                      <input
                        className="glass-input"
                        value={mod.name}
                        onChange={(e) =>
                          handleModuleNameChange(index, e.target.value)
                        }
                        placeholder={`e.g. Introduction to ${subjectName || "Subject"}`}
                      />
                    </div>

                    <div className="input-group" style={{ marginTop: "10px" }}>
                      <label>Upload PDFs for Module {mod.id}</label>
                      <div className="file-upload-wrapper">
                        <input
                          type="file"
                          accept="application/pdf"
                          multiple
                          onChange={(e) => handleModuleFilesChange(index, e)}
                          className="glass-file-input"
                        />
                        {(mod.extractedText || mod.fileStatus) && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.85rem",
                              marginTop: "10px",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              background: mod.fileStatus === "error" ? "rgba(255, 68, 68, 0.15)" : mod.fileStatus === "loading" ? "rgba(255, 204, 0, 0.15)" : "rgba(0, 255, 204, 0.15)",
                              color: mod.fileStatus === "error" ? "#ff4444" : mod.fileStatus === "loading" ? "#ffcc00" : "#00ffcc",
                              border: `1px solid ${mod.fileStatus === "error" ? "rgba(255, 68, 68, 0.3)" : mod.fileStatus === "loading" ? "rgba(255, 204, 0, 0.3)" : "rgba(0, 255, 204, 0.3)"}`
                            }}
                          >
                            {mod.fileStatus === "error" ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                Extraction Failed
                              </>
                            ) : mod.fileStatus === "loading" ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
                                  <line x1="12" y1="2" x2="12" y2="6"></line>
                                  <line x1="12" y1="18" x2="12" y2="22"></line>
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                </svg>
                                {mod.extractionProgress || "Waiting in queue..."}
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Extracted Successfully
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: ADVANCED SCHEDULER */}
            <div className="form-section scheduler-section">
              <h2 className="scheduler-title">Weekly Schedule Builder</h2>

              {/* --- NEW LOCATION FOR DIVISIONS --- */}
              <div
                className="input-group"
                style={{ marginTop: "10px", marginBottom: "20px" }}
              >
                <label style={{ fontSize: "0.9rem", color: "#ccc" }}>
                  Number of Divisions to teach
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="glass-input"
                  value={numDivisions}
                  onChange={handleNumDivisionsChange}
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
                      className={`day-tab ${activeDay === day ? "active" : ""}`}
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

                <select
                  className="glass-input time-select"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  style={{ width: "60px", padding: "8px" }}
                >
                  {[...Array(12).keys()].map((n) => (
                    <option key={n} value={String(n + 1).padStart(2, "0")}>
                      {n + 1}
                    </option>
                  ))}
                </select>
                <span style={{ color: "white" }}>:</span>

                <select
                  className="glass-input time-select"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  style={{ width: "60px", padding: "8px" }}
                >
                  <option value="00">00</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="40">40</option>
                </select>

                <select
                  className="glass-input time-select"
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  style={{ width: "60px", padding: "8px" }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>

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
              style={{ gridColumn: "1 / -1", marginTop: "20px" }}
            >
              {loading ? "AI Processing..." : "Generate Roadmap →"}
            </button>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 2 && (
          <div className="preview-content">
            <div className="preview-header">
              <h2>Course Roadmap Preview</h2>
              <div style={{ textAlign: "right" }}>
                <span className="lecture-count">
                  {generatedRoadmap[previewDivision]?.length || 0} Lectures
                </span>
                {/* Cost info is securely logged to the console */}
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
                  </div>
                  <div className="item-content">
                    <h3>{lecture.title}</h3>
                    <ul>
                      {lecture.checklist.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="action-row">
              <button
                className="glass-btn secondary"
                onClick={() => setStep(1)}
              >
                ← Edit Details
              </button>
              <button className="glass-btn primary" onClick={handleSaveCourse}>
                {loading ? "Saving..." : "Confirm & Save Course"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseGenerator;
