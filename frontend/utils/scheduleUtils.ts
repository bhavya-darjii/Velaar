/* eslint-disable */
// @ts-nocheck
import { addDays, format, getDay, parseISO } from 'date-fns';

// scheduleDays: Array of integers (0=Sun, 1=Mon, ..., 6=Sat)
// e.g., [1, 3, 5] for Mon, Wed, Fri
export const mapRoadmapToDates = (roadmap, startDate, scheduleDays) => {
  let currentDate = new Date(startDate);
  let assignedCount = 0;
  const newRoadmap = [];

  while (assignedCount < roadmap.length) {
    // Check if current day of week is in the teacher's schedule
    const currentDayOfWeek = getDay(currentDate); 
    
    if (scheduleDays.includes(currentDayOfWeek)) {
      // Assign this date to the current lecture
      newRoadmap.push({
        ...roadmap[assignedCount],
        date: format(currentDate, 'yyyy-MM-dd'), // Store as ISO string
        status: 'pending', // Default status
        isCompleted: false
      });
      assignedCount++;
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
  }
  
  return newRoadmap;
};
