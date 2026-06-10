const pdfParse = require('pdf-parse');
const crypto = require('crypto');
const activeDocuments = require('../models/activeDocuments');
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
require('dotenv').config();

// Custom Native Recursive Character Text Splitter
class RecursiveCharacterTextSplitter {
    constructor({ chunkSize = 1000, chunkOverlap = 200 } = {}) {
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
    }

    async splitText(text) {
        if (!text) return [];
        const chunks = [];
        let startIndex = 0;
        
        while (startIndex < text.length) {
            let endIndex = startIndex + this.chunkSize;
            
            // Try to find a natural break (newline or space) if we are not at the end
            if (endIndex < text.length) {
                const spaceIndex = text.lastIndexOf(' ', endIndex);
                const newlineIndex = text.lastIndexOf('\n', endIndex);
                const breakIndex = Math.max(spaceIndex, newlineIndex);
                
                // Only use the natural break if it's within the second half of the chunk to prevent tiny chunks
                if (breakIndex > startIndex + (this.chunkSize / 2)) {
                    endIndex = breakIndex;
                }
            }
            
            const chunk = text.slice(startIndex, endIndex).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }
            
            startIndex = endIndex - this.chunkOverlap;
            if (startIndex >= text.length || startIndex < 0) break; // Safeguard
        }
        
        return chunks;
    }
}

const { Chroma } = require("@langchain/community/vectorstores/chroma");

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
    const cleanBuffer = new Uint8Array(Uint8Array.prototype.slice.call(buffer));
    const data = await pdfParse(cleanBuffer, { pagerender: render_page });
    const rawText = data.text;
    const pages = [];
    const parts = rawText.split(/---PAGE_SPLIT_(\d+)---/);
    
    for (let i = 1; i < parts.length; i += 2) {
        const pageIdx = parseInt(parts[i], 10);
        pages.push({ page: pageIdx + 1, text: (parts[i + 1] || "").trim() });
    }

    if (pages.length === 0 && rawText.trim().length > 0) {
        pages.push({ page: 1, text: rawText.trim() });
    }
    return pages;
}

// Endpoint controller: Upload PDF document
async function uploadPdf(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log(`Parsing file: ${req.file.originalname} (${req.file.size} bytes)...`);
        const pages = await parsePdfToPages(req.file.buffer);
        const docId = crypto.randomUUID();

        console.log(`Generating embeddings and building vector store for ${docId}...`);
        
        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACE_API_KEY,
            model: "sentence-transformers/all-MiniLM-L6-v2",
        });
        
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const docsToEmbed = [];
        for (const page of pages) {
            const chunks = await splitter.splitText(page.text);
            for (const chunk of chunks) {
                docsToEmbed.push({ pageContent: chunk, metadata: { page: page.page } });
            }
        }

        // Initialize ChromaDB and store documents
        const vectorStore = await Chroma.fromDocuments(
            docsToEmbed,
            embeddings,
            {
                collectionName: `doc_${docId.replace(/-/g, '')}`, // Chroma collections must be alphanumeric
                url: process.env.CHROMA_URL || "http://localhost:8000"
            }
        );

        activeDocuments.set(docId, {
            filename: req.file.originalname,
            pages: pages,
            totalPages: pages.length,
            vectorStore: vectorStore,
            uploadedAt: new Date()
        });

        console.log(`Successfully parsed document ${docId} into ${docsToEmbed.length} vector chunks.`);
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
