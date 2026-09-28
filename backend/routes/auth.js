const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// Step 1: send the user to Salesforce's OAuth authorize page
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  // PKCE: generate a code_verifier and its SHA256 code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  req.session.codeVerifier = codeVerifier;
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SF_CLIENT_ID,
    redirect_uri: process.env.SF_REDIRECT_URI,
    scope: 'api refresh_token offline_access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authorizeUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;
  res.redirect(authorizeUrl);
});

// Step 2: Salesforce redirects back here with a ?code=...
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!state || state !== req.session.oauthState) {
    return res.redirect(`${process.env.FRONTEND_URL}/?error=invalid_state`);
  }

  try {
    const tokenResp = await axios.post(
      `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: process.env.SF_REDIRECT_URI,
        code_verifier: req.session.codeVerifier,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, instance_url } = tokenResp.data;

    req.session.sf = { access_token, refresh_token, instance_url };
    req.session.isAuthenticated = true;

    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
  }
});

router.get('/status', (req, res) => {
  res.json({ isAuthenticated: !!req.session.isAuthenticated });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;