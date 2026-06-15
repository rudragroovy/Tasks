const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const router = express.Router();

router.get('/token', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  const channelName = req.query.channelName;
  
  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }

  // Get App ID and App Certificate from environment variables
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appID || !appCertificate) {
    return res.status(500).json({ error: 'Agora App ID or Certificate missing in .env' });
  }

  // Set role to Publisher
  const role = RtcRole.PUBLISHER;
  
  // Set privilege expiration time to 1 hour
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appID,
      appCertificate,
      channelName,
      0, // uid 0 allows Agora to auto-assign a uid
      role,
      privilegeExpiredTs
    );
    
    return res.json({ token });
  } catch (err) {
    console.error('Error generating Agora token:', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
