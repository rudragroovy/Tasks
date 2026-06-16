const express = require('express');
const axios = require('axios');
const router = express.Router();

// The authenticate middleware can be used if you only want logged-in patients to talk to the AI
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/signed-url', authenticate, async (req, res) => {
  try {
    const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_4201kv78thnxe83vfzekpbdzq15b';
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not configured on the server.' });
    }

    const response = await axios.get(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    res.json({ signedUrl: response.data.signed_url });
  } catch (error) {
    console.error("Error generating signed URL:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

module.exports = router;
