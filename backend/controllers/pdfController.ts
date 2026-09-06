import { Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfParseModule = require('pdf-parse');

export const extractPDFText = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const dataBuffer = req.file.buffer;
    let extractedText = '';
    let numPages = 1;

    // Support pdf-parse v2 class structure
    if (pdfParseModule?.PDFParse) {
      const uint8 = new Uint8Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const parser = new pdfParseModule.PDFParse(uint8);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await parser.getText();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      extractedText = (typeof result === 'string' ? result : (result?.text ?? '')) as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      numPages = (result?.total || (Array.isArray(result?.pages) ? result.pages.length : 1)) as number;
    } else if (typeof pdfParseModule === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const data = await pdfParseModule(dataBuffer);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      extractedText = (data.text || '') as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      numPages = (data.numpages || 1) as number;
    } else {
      throw new Error('Unsupported pdf-parse module format');
    }

    if (!extractedText || extractedText.trim().length < 20) {
      res.status(400).json({ error: "No readable text found in PDF. Make sure it's not purely a scanned image." });
      return;
    }

    res.status(200).json({ text: extractedText, pages: numPages });
  } catch (err) {
    console.error('[pdfController] extractPDFText error:', err);
    res.status(500).json({ error: 'Failed to extract text from PDF.', details: err instanceof Error ? err.message : String(err) });
  }
};
