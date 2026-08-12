import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
export const extractPDFText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = req.file.buffer;
    
    // Process the buffer
    const data = await pdfParse(dataBuffer);
    
    const extractedText = data.text;
    if (!extractedText || extractedText.trim().length < 20) {
       return res.status(400).json({ error: "No readable text found in PDF. Make sure it's not purely a scanned image." });
    }

    return res.status(200).json({ text: extractedText, pages: data.numpages });
  } catch (error) {
    console.error("Backend PDF Extraction Error:", error);
    return res.status(500).json({ error: "Failed to extract text." });
  }
};
