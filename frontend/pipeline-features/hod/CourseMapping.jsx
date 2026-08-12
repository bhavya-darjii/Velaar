import React, { useState } from 'react';
import './CourseMapping.css';

const CourseMapping = () => {
  const [courseName, setCourseName] = useState('');
  const [programOutcomes, setProgramOutcomes] = useState(['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6']);
  const [courseOutcomes, setCourseOutcomes] = useState([
    { id: 'CO1', desc: 'Understand basic concepts' },
    { id: 'CO2', desc: 'Apply principles to solve problems' }
  ]);
  
  const [mapping, setMapping] = useState({});

  const handleMappingChange = (coId, poId, value) => {
    setMapping(prev => ({
      ...prev,
      [`${coId}_${poId}`]: value
    }));
  };

  const handleSave = () => {
    console.log("Saving Mapping:", mapping);
    alert("Mapping saved successfully.");
  };

  return (
    <div className="course-mapping-container">
      <div className="glass-panel">
        <div className="header-row">
          <h2>OBE Course Mapping</h2>
          <button className="liquid-btn primary-btn" onClick={handleSave}>Save Mapping</button>
        </div>
        <p className="subtitle">Map Course Outcomes (CO) to Program Outcomes (PO)</p>
        
        <div className="input-group">
          <label>Course Name</label>
          <input 
            type="text" 
            className="liquid-input" 
            placeholder="e.g., Data Structures and Algorithms"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>

        <div className="mapping-table-container">
          <table className="mapping-table">
            <thead>
              <tr>
                <th>CO / PO</th>
                {programOutcomes.map(po => <th key={po}>{po}</th>)}
              </tr>
            </thead>
            <tbody>
              {courseOutcomes.map(co => (
                <tr key={co.id}>
                  <td className="co-header">
                    <strong>{co.id}</strong>
                    <span>{co.desc}</span>
                  </td>
                  {programOutcomes.map(po => {
                    const key = `${co.id}_${po}`;
                    return (
                      <td key={po}>
                        <select 
                          className="mapping-select"
                          value={mapping[key] || ''}
                          onChange={(e) => handleMappingChange(co.id, po, e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="1">1 (Low)</option>
                          <option value="2">2 (Medium)</option>
                          <option value="3">3 (High)</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CourseMapping;
