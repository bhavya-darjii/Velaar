/* eslint-disable */
// @ts-nocheck
import { supabase } from '../services/supabase';

const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/export` : `${BASE_URL}/api/export`;

export const exportLessonPlanToWord = async (course, lp) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_URL}/docx`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": session ? `Bearer ${session.access_token}` : ""
      },
      body: JSON.stringify({ course, lp })
    });

    if (!res.ok) {
      throw new Error("Failed to generate DOCX on the backend");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.subjectName || "Subject"}_Lesson_Plan.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Backend Export Error:", error);
    alert("There was an error generating your secure Word document.");
  }
};

