/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import './InteractiveTimetableGrid.css';

const InteractiveTimetableGrid = ({ timetable, onCellClick }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (!timetable) return null;

  const { meta, timeSlots, grid } = timetable;
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  const getComputedGrid = () => {
    if (!isPrinting || !grid) return grid; // Return original grid if not printing

    const mergedGrid = JSON.parse(JSON.stringify(grid));
    
    days.forEach(day => {
       let previousSlotData = null;
       let previousSlotId = null;
       
       for(let i = 0; i < timeSlots.length; i++) {
           const slot = timeSlots[i];
           if (slot.type === 'break') {
               previousSlotData = null;
               continue;
           }
           
           const cellData = mergedGrid?.[day]?.[slot.id];
           if (!cellData || cellData === 'skip') {
               previousSlotData = null;
               continue;
           }
           
           if (previousSlotData && JSON.stringify(cellData) === JSON.stringify(previousSlotData)) {
               // Merge with previous
               mergedGrid[day][previousSlotId].colSpan = (mergedGrid[day][previousSlotId].colSpan || 1) + 1;
               mergedGrid[day][slot.id] = 'skip';
           } else {
               previousSlotData = cellData;
               previousSlotId = slot.id;
               mergedGrid[day][slot.id].colSpan = 1;
           }
       }
    });
    return mergedGrid;
  };

  const computedGrid = getComputedGrid();

  return (
    <div className="timetable-wrapper">
      {/* Header Info */}
      <div className="timetable-header-info">
        <div className="timetable-logos">
          <h2>{meta?.instituteName || '\u00A0'}</h2>
          <h3>{meta?.subtitle || '\u00A0'}</h3>
        </div>
        <div className="timetable-titles">
          <h3>DEPARTMENT : {meta?.department?.toUpperCase()}</h3>
          <h4>TIME TABLE FOR ACADEMIC YEAR {meta?.academicYear} ({meta?.semesterType} SEM)</h4>
          <h5>DIV- {meta?.division}, {meta?.year} YEAR SEM-{meta?.semester}</h5>
        </div>
        <div className="timetable-meta">
          <span>CLASS ROOM : {meta?.defaultRoom}</span>
          <span>W.E.F: {meta?.wefDate}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="timetable-table-container">
        <table className="interactive-timetable">
          <thead>
            <tr>
              <th className="day-col">DAY<br/>TIME</th>
              {timeSlots?.map((slot, index) => (
                <th key={index} className={slot.type === 'break' ? 'break-col' : ''} style={{ width: slot.type === 'break' ? '40px' : 'auto' }}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIndex) => (
              <tr key={day}>
                <td className="day-name">{day}</td>
                {timeSlots?.map((slot, slotIndex) => {
                  // If it's a break slot
                  if (slot.type === 'break') {
                    // Only render the break td on the first row (Monday), and let it span all 5 rows
                    if (dayIndex === 0) {
                      return (
                        <td key={slot.id} rowSpan={5} className="break-cell">
                          <div className="vertical-text">{slot.name}</div>
                        </td>
                      );
                    }
                    return null; // Skip rendering for other days because of rowSpan
                  }

                  // Normal Slot
                  const cellData = computedGrid?.[day]?.[slot.id];

                  // Handle colSpan (e.g. practicals spanning 2 slots)
                  // If cellData is marked as 'skip' (meaning a previous slot spanned into this one), don't render td.
                  if (cellData === 'skip') return null;

                  if (!cellData) {
                    return <td key={slot.id} className="empty-cell" onClick={() => onCellClick && onCellClick(day, slot.id)}></td>;
                  }

                  const colSpan = cellData.colSpan || 1;
                  const textColor = cellData.color ? '#000000' : '#ffffff'; // Rough contrast handling

                  return (
                    <td 
                      key={slot.id} 
                      colSpan={colSpan} 
                      className={`filled-cell ${cellData.type === 'batches' ? 'batches-cell' : 'single-cell'}`}
                      style={{ backgroundColor: cellData.color || 'transparent', color: textColor }}
                      onClick={() => onCellClick && onCellClick(day, slot.id, cellData)}
                    >
                      {cellData.type === 'batches' ? (
                        <div className="batches-container">
                          {cellData.batches.map((batch, bIdx) => (
                            <div key={bIdx} className="batch-row">
                              <strong>{batch.name}-{batch.subject}</strong> ({batch.teacher}) {batch.room ? `(${batch.room})` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="single-content">
                          <div className="subject-title"><strong>{cellData.subject}</strong></div>
                          <div className="teacher-name">{cellData.teacher} / {cellData.room}</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="timetable-footer">
        <div className="teacher-legend">
          {meta?.teachersList?.map((t, i) => (
            <div key={i} className="legend-item">
              <strong>{t.initials}</strong>={t.name}
            </div>
          ))}
        </div>
        <div className="signatures">
          <div className="sig-block">
            <div className="sig-line"></div>
            <span>Prepared By</span>
          </div>
          <div className="sig-block">
            <div className="sig-line"></div>
            <span>Time Table Incharge</span>
          </div>
          <div className="sig-block">
            <div className="sig-line"></div>
            <span>HOD {meta?.departmentInitials}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTimetableGrid;

