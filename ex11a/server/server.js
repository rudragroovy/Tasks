const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
const activeDocuments = require('./models/activeDocuments');
const { parsePdfToPages } = require('./controllers/documentController');
const { getRelevantPages } = require('./controllers/chatController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Smart Doc Q&A server listening on port ${port}`);
    });
}

// Retain compatibility exports for test runner scripts
module.exports = { getRelevantPages, parsePdfToPages, activeDocuments };
