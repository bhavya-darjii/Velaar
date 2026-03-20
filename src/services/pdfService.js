import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

/* ------------------------------------------------------
   PRODUCTION FIX:
   We import the worker using '?url'. 
   Vite will bundle this file into your final build.
   It will work on Localhost AND your deployed website.
   ------------------------------------------------------
*/
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractTextFromPDF = async (file, onProgress) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF using the bundled worker
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      // 1. Get the page
      const page = await pdf.getPage(i);
      
      // 2. Set scale to 2.0 for clear OCR reading
      const viewport = page.getViewport({ scale: 2.0 });
      
      // 3. Create a canvas to "screenshot" the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 4. Render PDF page onto canvas
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // 5. Convert screenshot to image blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve));

      // 6. Run OCR (Tesseract) on the image
      if (onProgress) onProgress(`Scanning Page ${i} of ${totalPages}...`);
      
      // Tesseract will download its own worker from a CDN automatically.
      // This is generally allowed by browsers.
      const result = await Tesseract.recognize(blob, 'eng');

      const pageText = result.data.text;
      
      // Only add text if it's not empty garbage
      if (pageText.trim().length > 5) {
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
    }

    if (fullText.length < 20) {
      throw new Error("OCR finished but found no text. The image might be too blurry.");
    }

    return fullText;

  } catch (error) {
    console.error("Extraction Error:", error);
    throw new Error(error.message || "Failed to scan PDF.");
  }
};