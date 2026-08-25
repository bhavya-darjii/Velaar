// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
// pdf-parse is a CommonJS module with no type declarations
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfParse = require('pdf-parse');
export const extractPDFText = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No PDF file uploaded' });
            return;
        }
        const dataBuffer = req.file.buffer;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const data = await pdfParse(dataBuffer);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const extractedText = data.text;
        if (!extractedText || extractedText.trim().length < 20) {
            res.status(400).json({ error: "No readable text found in PDF. Make sure it's not purely a scanned image." });
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.status(200).json({ text: extractedText, pages: data.numpages });
    }
    catch (err) {
        console.error('[pdfController] extractPDFText error:', err);
        res.status(500).json({ error: 'Failed to extract text from PDF.' });
    }
};
