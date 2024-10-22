const DEVICE_TYPES = {
    IOS: 'ios',
    ANDROID: 'android',
    DESKTOP: 'desktop',
    UNKNOWN: 'unknown'
};

const REDIRECT_SCHEMES = {
    YOUTUBE: 'youtube://',
    HTTPS: 'https://',
    YOUTUBE_REDIRECT: 'https://www.youtube.com/redirect?q=https://',
    YOUTUBE_ANDROID_INTENT: 'intent://'
};

const HEADERS = {
    IOS: 'cloudfront-is-ios-viewer',
    ANDROID: 'cloudfront-is-android-viewer',
    DESKTOP: 'cloudfront-is-desktop-viewer',
    AUTHORIZATION: 'authorization',
    ACCEPT: 'accept',
    API_KEY: 'x-api-key'
};

const cleanUrl = (url) => url.replace(/^\//, '').replace(/^https?:\/\//, '');

const getDeviceType = (headers) => {
    if (headers[HEADERS.IOS] === 'true') return DEVICE_TYPES.IOS;
    if (headers[HEADERS.ANDROID] === 'true') return DEVICE_TYPES.ANDROID;
    if (headers[HEADERS.DESKTOP] === 'true') return DEVICE_TYPES.DESKTOP;
    return DEVICE_TYPES.UNKNOWN;
};

const createRedirectUrl = (cleanedLink, deviceType) => {
    const urls = {
        [DEVICE_TYPES.IOS]: `${REDIRECT_SCHEMES.YOUTUBE}${cleanedLink}`,
        [DEVICE_TYPES.ANDROID]: `${REDIRECT_SCHEMES.YOUTUBE_ANDROID_INTENT}${cleanedLink}#Intent;` +
        `scheme=https;package=com.google.android.youtube;` +
        `fallback=https://www.youtube.com/${cleanedLink};` +
        `S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.google.android.youtube;end`,
        [DEVICE_TYPES.DESKTOP]: `${REDIRECT_SCHEMES.HTTPS}${cleanedLink}`,
        [DEVICE_TYPES.UNKNOWN]: `${REDIRECT_SCHEMES.YOUTUBE_REDIRECT}${cleanedLink}`
    };
    return urls[deviceType] || urls[DEVICE_TYPES.UNKNOWN];
};

const logHeaders = (headers) => {
    console.log('All Headers:', JSON.stringify(headers, null, 2));
    if (headers[HEADERS.AUTHORIZATION]) console.log('Authorization header present');
    console.log('Accept:', headers[HEADERS.ACCEPT]);
    if (headers[HEADERS.API_KEY]) console.log('API Key present');
};

const createHtmlResponse = (redirectLocation, cleanedLink) => `
  <!DOCTYPE html>
  <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YouTube 앱으로 이동</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f9f9f9;
        }
        .container {
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          background-color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #030303;
        }
        p {
          color: #606060;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          font-size: 16px;
          color: white;
          background-color: #FF0000;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #CC0000;
        }
      </style>
      <script>
        function tryOpenApp() {
          var start = Date.now();
          window.location.href = "${redirectLocation}";
          setTimeout(function() {
            if (Date.now() - start < 2000) {
              window.location.href = "https://play.google.com/store/apps/details?id=com.google.android.youtube";
            }
          }, 1500);
        }
      </script>
    </head>
    <body onload="tryOpenApp()">
      <div class="container">
        <h1>YouTube 앱으로 이동 중</h1>
        <p>잠시만 기다려주세요...</p>
        <a href="https://${cleanedLink}" class="button">웹에서 열기</a>
      </div>
    </body>
  </html>
`;

const createResponse = (statusCode, headers, body) => ({
    statusCode,
    headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    },
    body
});

exports.redirectHandler = async (event) => {
    try {
        const { rawPath = '', rawQueryString = '', headers = {} } = event;

        const originalLink = `${rawPath}${rawQueryString ? `?${rawQueryString}` : ''}`;
        const cleanedLink = cleanUrl(originalLink);

        logHeaders(headers);

        const deviceType = getDeviceType(headers);
        const redirectLocation = createRedirectUrl(cleanedLink, deviceType);

        console.log('Device Type:', deviceType);
        console.log('Redirect Location:', redirectLocation);

        if (deviceType === DEVICE_TYPES.ANDROID) {
            return createResponse(200, { 'Content-Type': 'text/html' }, createHtmlResponse(redirectLocation, cleanedLink));
        }

        return createResponse(302, { Location: redirectLocation });
    } catch (error) {
        console.error('Error in redirect handler:', error, error.stack);
        return createResponse(500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Internal Server Error' }));
    }
};
