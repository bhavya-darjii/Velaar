
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/export`;

export const exportLessonPlanToWord = async (course, lp) => {
  try {
    const res = await fetch(`${API_URL}/docx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
