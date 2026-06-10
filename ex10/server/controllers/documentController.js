const pdfParse = require('pdf-parse');
const crypto = require('crypto');
const activeDocuments = require('../models/activeDocuments');

// Helper: Custom page render function for pdf-parse to split by page numbers
function render_page(pageData) {
    return pageData.getTextContent()
        .then(function(textContent) {
            let text = textContent.items.map(item => item.str).join(' ');
            return `---PAGE_SPLIT_${pageData.pageIndex}---` + text;
        });
}

// Helper: Parse PDF buffer page by page
async function parsePdfToPages(buffer) {
    // Clone buffer to isolate the underlying ArrayBuffer without Node's Buffer wrapper
    const cleanBuffer = new Uint8Array(Uint8Array.prototype.slice.call(buffer));
    const data = await pdfParse(cleanBuffer, { pagerender: render_page });
    const rawText = data.text;
    const pages = [];
    const parts = rawText.split(/---PAGE_SPLIT_(\d+)---/);
    
    for (let i = 1; i < parts.length; i += 2) {
        const pageIdx = parseInt(parts[i], 10);
        const pageNum = pageIdx + 1;
        const pageText = parts[i + 1] || "";
        pages.push({
            page: pageNum,
            text: pageText.trim()
        });
    }

    if (pages.length === 0 && rawText.trim().length > 0) {
        pages.push({
            page: 1,
            text: rawText.trim()
        });
    }
    return pages;
}

// Endpoint controller: Upload PDF document
async function uploadPdf(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: "Only PDF files are supported" });
        }

        console.log(`Parsing file: ${req.file.originalname} (${req.file.size} bytes)...`);
        const pages = await parsePdfToPages(req.file.buffer);
        const docId = crypto.randomUUID();

        activeDocuments.set(docId, {
            filename: req.file.originalname,
            pages: pages,
            totalPages: pages.length,
            uploadedAt: new Date()
        });

        console.log(`Successfully parsed document ${docId} with ${pages.length} pages.`);
        res.json({
            docId,
            filename: req.file.originalname,
            totalPages: pages.length
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to parse PDF document: " + error.message });
    }
}

// Endpoint controller: Retrieve single page text excerpt
function getPageExcerpt(req, res) {
    try {
        const { docId, pageNum } = req.params;
        const doc = activeDocuments.get(docId);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        const pNum = parseInt(pageNum, 10);
        const page = doc.pages.find(p => p.page === pNum);
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }
        res.json({
            page: pNum,
            text: page.text
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    parsePdfToPages,
    uploadPdf,
    getPageExcerpt
};
