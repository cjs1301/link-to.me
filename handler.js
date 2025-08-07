/**
 * 디바이스 타입 확인 및 리다이렉트 처리를 위한 Lambda 핸들러
 */

const YOUTUBE_WEB = "https://www.youtube.com/";

/**
 * 요청 헤더에서 디바이스 타입 확인
 */
const getDeviceType = (headers = {}) => {
    if (headers["cloudfront-is-ios-viewer"] === "true") return "ios";
    if (headers["cloudfront-is-android-viewer"] === "true") return "android";
    if (headers["cloudfront-is-desktop-viewer"] === "true") return "desktop";
    return "unknown";
};

/**
 * User-Agent에서 인앱브라우저 감지
 */
const isInAppBrowser = (userAgent = "") => {
    const inAppPatterns = [
        "FBAN",
        "FBAV", // Facebook
        "Instagram", // Instagram
        "KAKAOTALK", // KakaoTalk
        "Line/", // Line
        "wv", // WebView 일반적인 패턴
        "Version/.*Mobile.*Safari", // 모바일 Safari (인앱일 가능성)
    ];

    return inAppPatterns.some((pattern) => new RegExp(pattern, "i").test(userAgent));
};

/**
 * URL 정리 및 리다이렉트 URL 생성
 */
const createRedirectUrl = (rawUrl, deviceType, userAgent = "") => {
    // 앞쪽 슬래시 제거
    let cleanedLink = rawUrl.replace(/^\//, "");

    // 유효하지 않은 URL 체크
    if (!cleanedLink || cleanedLink === ".env") {
        return YOUTUBE_WEB;
    }

    // URL 정규화 - 프로토콜 제거
    cleanedLink = cleanedLink.replace(/^https?:\/\//, "");

    // youtube.com이나 youtu.be가 이미 포함되어 있는지 확인
    const hasYoutubeDomain =
        cleanedLink.includes("youtube.com") || cleanedLink.includes("youtu.be");

    // 최종 웹 URL 생성
    const webUrl = hasYoutubeDomain ? `https://${cleanedLink}` : `${YOUTUBE_WEB}${cleanedLink}`;

    // 디바이스 타입별 URL 생성
    switch (deviceType) {
        case "ios":
            // iOS의 경우 youtube:// 스키마 사용
            return `youtube://${cleanedLink}`;

        case "android":
            // Android 인앱브라우저 감지
            const isInApp = isInAppBrowser(userAgent);

            if (isInApp) {
                // 인앱브라우저인 경우 HTML 페이지로 처리
                return "ANDROID_INAPP_HTML_NEEDED";
            } else {
                // 일반 브라우저에서는 바로 intent URL로 리다이렉트
                if (hasYoutubeDomain) {
                    // YouTube URL인 경우 watch?v= 형태로 변환
                    if (cleanedLink.includes("youtube.com/watch")) {
                        // 전체 쿼리 파라미터 보존
                        const queryStart = cleanedLink.indexOf("?");
                        const queryString =
                            queryStart !== -1 ? cleanedLink.substring(queryStart) : "";
                        return `intent://www.youtube.com/watch${queryString}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                            webUrl
                        )};end`;
                    } else if (cleanedLink.includes("youtube.com/playlist")) {
                        // 플레이리스트 쿼리 파라미터 보존
                        const queryStart = cleanedLink.indexOf("?");
                        const queryString =
                            queryStart !== -1 ? cleanedLink.substring(queryStart) : "";
                        return `intent://www.youtube.com/playlist${queryString}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                            webUrl
                        )};end`;
                    } else if (cleanedLink.includes("youtu.be/")) {
                        // youtu.be 링크를 완전한 YouTube URL로 변환
                        const parts = cleanedLink.split("youtu.be/")[1];
                        const [videoId, ...queryParts] = parts.split("?");
                        const additionalParams =
                            queryParts.length > 0 ? `&${queryParts.join("&")}` : "";
                        return `intent://www.youtube.com/watch?v=${videoId}${additionalParams}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                            webUrl
                        )};end`;
                    }
                }

                // 기본 YouTube 앱 연결
                return `intent://www.youtube.com/${cleanedLink}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                    webUrl
                )};end`;
            }

        default:
            // 데스크탑의 경우 항상 웹 버전으로 (더 정확한 URL 처리)
            // 쿼리 파라미터 보존
            const [path, query] = cleanedLink.split("?");
            const queryString = query ? `?${query}` : "";

            // YouTube 단축 URL (youtu.be) 처리
            if (path.startsWith("youtu.be/")) {
                return `https://${path}${queryString}`;
            }

            // 일반 YouTube URL 처리
            if (hasYoutubeDomain) {
                return `https://${path}${queryString}`;
            }

            // YouTube 도메인이 없는 경우 youtube.com에 추가
            return `${YOUTUBE_WEB}${path}${queryString}`;
    }
};

/**
 * Android 인앱브라우저용 HTML 응답 생성
 */
const generateAndroidInAppHtml = (webUrl, cleanedLink) => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube로 이동중...</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center; 
            padding: 50px 20px; 
            background: #f8f9fa;
            margin: 0;
        }
        .container { 
            max-width: 400px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .loading { 
            margin: 20px 0; 
            font-size: 18px; 
            color: #333;
        }
        .fallback-btn { 
            display: inline-block; 
            background: #ff0000; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin-top: 20px;
            font-weight: 500;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ff0000;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div class="loading">YouTube 앱으로 이동중...</div>
        <a href="${webUrl}" class="fallback-btn" id="fallbackBtn" style="display: none;">
            브라우저에서 열기
        </a>
    </div>
    
    <script>
        function openYouTube() {
            try {
                // YouTube 앱 URL 생성
                let intentUrl = '';
                const link = '${cleanedLink}';
                
                // URL 타입에 따른 intent URL 생성
                if (link.includes('youtube.com/watch')) {
                    // 전체 쿼리 파라미터 보존
                    const queryStart = link.indexOf('?');
                    const queryString = queryStart !== -1 ? link.substring(queryStart) : '';
                    intentUrl = \`intent://www.youtube.com/watch\${queryString}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                        webUrl
                    )};end\`;
                } else if (link.includes('youtube.com/playlist')) {
                    // 플레이리스트 쿼리 파라미터 보존
                    const queryStart = link.indexOf('?');
                    const queryString = queryStart !== -1 ? link.substring(queryStart) : '';
                    intentUrl = \`intent://www.youtube.com/playlist\${queryString}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                        webUrl
                    )};end\`;
                } else if (link.includes('youtu.be/')) {
                    // youtu.be 링크를 완전한 YouTube URL로 변환
                    const parts = link.split('youtu.be/')[1];
                    const [videoId, ...queryParts] = parts.split('?');
                    const additionalParams = queryParts.length > 0 ? \`&\${queryParts.join('&')}\` : '';
                    intentUrl = \`intent://www.youtube.com/watch?v=\${videoId}\${additionalParams}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                        webUrl
                    )};end\`;
                } else {
                    intentUrl = \`intent://www.youtube.com/\${link}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
                        webUrl
                    )};end\`;
                }
                
                let appOpened = false;
                
                // 첫 번째 시도: Intent URL로 앱 열기
                if (intentUrl) {
                    setTimeout(() => {
                        if (!appOpened) {
                            try {
                                window.location.href = intentUrl;
                            } catch (e) {
                                console.log('Intent URL 실패:', e);
                            }
                        }
                    }, 100);
                }
                
                // 두 번째 시도: YouTube 앱 스키마
                setTimeout(() => {
                    if (!appOpened) {
                        try {
                            window.location.href = 'youtube://${cleanedLink}';
                        } catch (e) {
                            console.log('YouTube 스키마 실패:', e);
                        }
                    }
                }, 1000);
                
                // 세 번째 시도: 외부 브라우저에서 열기
                setTimeout(() => {
                    if (!appOpened) {
                        try {
                            window.open('${webUrl}', '_system');
                        } catch (e) {
                            console.log('외부 브라우저 열기 실패:', e);
                        }
                    }
                }, 2000);
                
                // 최종 fallback: 현재 창에서 웹 버전 열기
                setTimeout(() => {
                    if (!appOpened) {
                        document.getElementById('fallbackBtn').style.display = 'inline-block';
                        window.location.href = '${webUrl}';
                    }
                }, 3000);
                
                // 페이지 visibility 변경 감지 (앱이 열렸는지 확인)
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        appOpened = true;
                    }
                });
                
                // 포커스 잃음 감지 (앱이 열렸는지 확인)
                window.addEventListener('blur', () => {
                    appOpened = true;
                });
                
            } catch (error) {
                console.error('YouTube 앱 열기 실패:', error);
                window.location.href = '${webUrl}';
            }
        }
        
        // 페이지 로드 시 즉시 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', openYouTube);
        } else {
            openYouTube();
        }
        
        // 뒤로 가기 방지
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, null, location.href);
        });
    </script>
</body>
</html>`;
};

/**
 * Lambda 핸들러 함수
 */
exports.redirectHandler = async (event) => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));

        const { rawPath = "", rawQueryString = "", headers = {} } = event;

        // 루트 경로 처리
        if (!rawPath || rawPath === "/") {
            return {
                statusCode: 302,
                headers: { Location: YOUTUBE_WEB },
            };
        }

        // URL 처리 및 리다이렉트
        const originalLink = `${rawPath}${rawQueryString ? `?${rawQueryString}` : ""}`;
        const deviceType = getDeviceType(headers);
        const userAgent = headers["user-agent"] || headers["User-Agent"] || "";
        const redirectLocation = createRedirectUrl(originalLink, deviceType, userAgent);

        console.log("Device Type:", deviceType);
        console.log("User Agent:", userAgent);
        console.log("Redirect Location:", redirectLocation);

        // Android 인앱브라우저의 경우 HTML 응답 반환
        if (redirectLocation === "ANDROID_INAPP_HTML_NEEDED") {
            const cleanedLink = originalLink.replace(/^\//, "").replace(/^https?:\/\//, "");
            const hasYoutubeDomain =
                cleanedLink.includes("youtube.com") || cleanedLink.includes("youtu.be");
            const webUrl = hasYoutubeDomain
                ? `https://${cleanedLink}`
                : `${YOUTUBE_WEB}${cleanedLink}`;

            const htmlContent = generateAndroidInAppHtml(webUrl, cleanedLink);

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
                body: htmlContent,
            };
        }

        // 일반적인 리다이렉트 응답
        return {
            statusCode: 302,
            headers: {
                Location: redirectLocation,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            },
        };
    } catch (error) {
        console.error("Error in redirect handler:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
