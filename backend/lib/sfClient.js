const axios = require('axios');

const API_VERSION = process.env.SF_API_VERSION || 'v61.0';

// Refreshes the access token using the stored refresh_token
async function refreshAccessToken(session) {
  const resp = await axios.post(
    `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.SF_CLIENT_ID,
      client_secret: process.env.SF_CLIENT_SECRET,
      refresh_token: session.sf.refresh_token,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  session.sf.access_token = resp.data.access_token;
  if (resp.data.instance_url) session.sf.instance_url = resp.data.instance_url;
}

// Wraps an axios call against the Salesforce REST API; retries once after
// refreshing the token if Salesforce says the session has expired.
async function sfRequest(session, { method = 'get', path, data, params }) {
  const doCall = () =>
    axios({
      method,
      url: `${session.sf.instance_url}/services/data/${API_VERSION}${path}`,
      data,
      params,
      headers: {
        Authorization: `Bearer ${session.sf.access_token}`,
        'Content-Type': 'application/json',
      },
    });

  try {
    return await doCall();
  } catch (err) {
    const isExpired =
      err.response?.status === 401 ||
      (Array.isArray(err.response?.data) &&
        err.response.data[0]?.errorCode === 'INVALID_SESSION_ID');

    if (isExpired && session.sf.refresh_token) {
      await refreshAccessToken(session);
      return doCall();
    }
    throw err;
  }
}

module.exports = { sfRequest, API_VERSION };
