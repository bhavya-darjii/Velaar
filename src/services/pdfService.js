const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/pdf`;

export const extractTextFromPDF = async (file, onProgress) => {
  try {
    if (onProgress) onProgress("Uploading file to secure server...");

    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch(`${API_URL}/extract`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to process PDF on the backend.");
    }

    if (onProgress) onProgress("Extracting structural text...");
    
    return data.text;
  } catch (error) {
    console.error("Extraction Error:", error);
    throw new Error(error.message || "Failed to scan PDF.");
  }
};