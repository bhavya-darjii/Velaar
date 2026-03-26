import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './CourseChecklist.css';

// Component 1: The Active Lecture Checklist
export const ActiveLecture = ({ course, setCourse, currentLecture, setCurrentLecture }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  
  const toggleChecklist = async (pointIndex) => {
    if (!course || !currentLecture) return;

    const div = currentLecture.division || "A";
    const isObjectRoadmap = !Array.isArray(course.roadmap);
    
    let updatedRoadmapContent = isObjectRoadmap ? [...course.roadmap[div]] : [...course.roadmap];
    const lectureIndex = updatedRoadmapContent.findIndex(l => l.lectureNum === currentLecture.lectureNum);
    
    if (lectureIndex === -1) return;

    if (!updatedRoadmapContent[lectureIndex].checkedItems) {
      updatedRoadmapContent[lectureIndex].checkedItems = [];
    }

    const currentChecked = updatedRoadmapContent[lectureIndex].checkedItems;
    if (currentChecked.includes(pointIndex)) {
      updatedRoadmapContent[lectureIndex].checkedItems = currentChecked.filter(i => i !== pointIndex);
    } else {
      updatedRoadmapContent[lectureIndex].checkedItems.push(pointIndex);
    }

    const newFullRoadmap = isObjectRoadmap ? { ...course.roadmap, [div]: updatedRoadmapContent } : updatedRoadmapContent;

    setCourse({ ...course, roadmap: newFullRoadmap });
    setCurrentLecture({...updatedRoadmapContent[lectureIndex], division: div}); 

    const courseRef = doc(db, "courses", course.id);
    await updateDoc(courseRef, { roadmap: newFullRoadmap });
  };

  const finishLecture = async () => {
    setIsCompleting(true);

    setTimeout(async () => {
      const div = currentLecture.division || "A";
      const isObjectRoadmap = !Array.isArray(course.roadmap);
      
      let updatedRoadmapContent = isObjectRoadmap ? [...course.roadmap[div]] : [...course.roadmap];
      const lectureIndex = updatedRoadmapContent.findIndex(l => l.lectureNum === currentLecture.lectureNum);
      
      updatedRoadmapContent[lectureIndex].isCompleted = true;
      updatedRoadmapContent[lectureIndex].status = "completed";

      const newFullRoadmap = isObjectRoadmap ? { ...course.roadmap, [div]: updatedRoadmapContent } : updatedRoadmapContent;

      setCourse({ ...course, roadmap: newFullRoadmap });
      await updateDoc(doc(db, "courses", course.id), { roadmap: newFullRoadmap });
      
      let allLectures = [];
      if (isObjectRoadmap) {
        Object.entries(newFullRoadmap).forEach(([d, lecs]) => {
          lecs.forEach(l => allLectures.push({ ...l, division: d }));
        });
      } else {
        allLectures = newFullRoadmap.map(l => ({...l, division: "A"}));
      }
      allLectures.sort((a, b) => new Date(a.fullIsoDate || 0) - new Date(b.fullIsoDate || 0));

      const next = allLectures.find(l => !l.isCompleted);
      
      setIsCompleting(false);
      if (next) {
        setSlideIn(true);
        setCurrentLecture(next);
        setTimeout(() => setSlideIn(false), 500);
      } else {
        alert("🎉 Course Completed! Congratulations.");
      }
    }, 1500);
  };

  let liveStatusText = "LIVE NOW";
  if (currentLecture?.fullIsoDate) {
    const lecDate = new Date(currentLecture.fullIsoDate);
    const today = new Date();
    if (lecDate.toDateString() === today.toDateString()) {
      liveStatusText = `Today at ${currentLecture.time}`;
    } else {
      liveStatusText = `${currentLecture.date} at ${currentLecture.time}`;
    }
  } else if (!currentLecture) {
    liveStatusText = "UPCOMING LECTURE";
  }

  return (
    <section className={`active-card ${slideIn ? 'slide-in-right' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {isCompleting && (
        <div style={{
           position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
           background: 'rgba(30, 215, 96, 0.95)', 
           display: 'flex', alignItems: 'center', justifyContent: 'center', 
           zIndex: 10, animation: 'fadeInOverlay 0.3s ease-out'
        }}>
           <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
             <polyline points="20 6 9 17 4 12"></polyline>
           </svg>
        </div>
      )}
      <div className="card-header">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span className="tag-live" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
            {liveStatusText}
          </span>
          {currentLecture?.moduleName && (
            <span className="tag-live" style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              color: '#fff', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: 'none',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '800'
            }}>
              {currentLecture.moduleName}
            </span>
          )}
        </div>
        <h2>{currentLecture?.division ? `Div ${currentLecture.division} - ` : ""}Lecture {currentLecture?.lectureNum}: {currentLecture?.title}</h2>
      </div>
      
      <div className="checklist-area">
        <h3>Instructor Checklist</h3>
        <p className="instruction">Tick these off as you teach to track coverage.</p>
        
        <div className="checklist-items">
          {currentLecture?.checklist.map((item, idx) => {
            const isChecked = currentLecture.checkedItems?.includes(idx);
            return (
              <div 
                key={idx} 
                className={`check-item ${isChecked ? 'checked' : ''}`}
                onClick={() => toggleChecklist(idx)}
              >
                <div className="checkbox-circle">{isChecked ? "✔" : ""}</div>
                <span>{item}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="finish-btn" onClick={finishLecture}>
        Mark Lecture as Complete
      </button>
    </section>
  );
};

// Component 2: The Sidebar Roadmap
export const RoadmapSidebar = ({ course, currentLecture }) => {
  let allLectures = [];
  if (course?.roadmap && !Array.isArray(course.roadmap)) {
    Object.entries(course.roadmap).forEach(([div, lecs]) => {
      lecs.forEach(l => allLectures.push({ ...l, division: div }));
    });
  } else if (Array.isArray(course?.roadmap)) {
    allLectures = course.roadmap.map(l => ({...l, division: "A"}));
  }
  
  allLectures.sort((a, b) => new Date(a.fullIsoDate || 0) - new Date(b.fullIsoDate || 0));

  return (
    <div className="roadmap-mini">
      <h3>Upcoming Roadmap</h3>
      <ul>
        {allLectures
          .filter(l => !l.isCompleted && (l.lectureNum !== currentLecture?.lectureNum || l.division !== currentLecture?.division))
          .slice(0, 5)
          .map((l, i) => (
            <li key={i}>
              <span className="mini-num">Div {l.division} #{l.lectureNum}</span> {l.title}
            </li>
        ))}
      </ul>
    </div>
  );
};