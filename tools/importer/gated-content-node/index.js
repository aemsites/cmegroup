require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'], // your frontend origin and importer
  credentials: true,               // allow cookies or credentials if needed
};

app.use(cors(corsOptions));
const PORT = 4005;

const DOMAIN = 'https://www.cmegroup.com';

// Authentication credentials for gated content
const AUTH_COOKIES = {
  SecureFgp: process.env.CME_SECURE_FGP,
  userId: process.env.CME_USER_ID,
  cmeToken: process.env.CME_TOKEN,
};

/**
 * Fetches gated content using authentication cookies
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The response text
 */
async function fetchGatedContent(url) {
  // Format cookies with proper names as shown in the issue
  const cookieString = [
    `__Secure-Fgp=${AUTH_COOKIES.SecureFgp}`,
    `userId=${AUTH_COOKIES.userId}`,
    `cmeToken=${AUTH_COOKIES.cmeToken}`,
  ].join('; ');

  console.log(cookieString);

  // Define request headers
  const requestHeaders = {
    Cookie: cookieString,
    'User-Agent': 'CME Group Helix',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    Origin: DOMAIN,
    'Content-Type': 'text/html',
    Referer: `${DOMAIN}/`,
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: requestHeaders,
  });

  // Get response text
  const responseText = await response.text();

  if (!response.ok) {
    console.warn(`Failed to fetch gated content: ${response.statusText}`);
    return null;
  }

  return responseText;
}

// Middleware to parse JSON requests
app.use(express.json());

// Hello API endpoint
app.get('/api/hello', async (req, res) => {
  try {
    // You can optionally provide a URL parameter to test the gated content function
    const testUrl = req.query.url;
    
    // Call the gated content function
    const gatedContent = await fetchGatedContent(testUrl);
    
    res.json({ 
      message: 'hello',
      gatedContentTest: {
        url: testUrl,
        success: gatedContent !== null,
        contentLength: gatedContent ? gatedContent.length : 0,
        // Don't return the full content to avoid overwhelming the response
        contentPreview: gatedContent ? gatedContent : null
      }
    });
  } catch (error) {
    console.error('Error in /api/hello:', error);
    res.status(500).json({ 
      message: 'hello',
      error: 'Failed to fetch gated content',
      details: error.message
    });
  }
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Server is running on port 4005' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Hello API available at http://localhost:${PORT}/api/hello`);
});