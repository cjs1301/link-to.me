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
 * URL 정리 및 리다이렉트 URL 생성
 */
const createRedirectUrl = (rawUrl, deviceType) => {
    // 앞쪽 슬래시 제거
    let cleanedLink = rawUrl.replace(/^\//, "");

    // 유효하지 않은 URL 체크
    if (!cleanedLink || cleanedLink === ".env") {
        return YOUTUBE_WEB;
    }

    // 디바이스 타입별 URL 생성
    switch (deviceType) {
        case "ios":
            // iOS의 경우 http/https 제거하고 youtube:// 스키마 사용
            cleanedLink = cleanedLink.replace(/^https?:\/\//, "");
            return `youtube://${cleanedLink}`;
        case "android":
            // Android의 경우 http/https 제거하고 intent 스키마 사용
            cleanedLink = cleanedLink.replace(/^https?:\/\//, "");
            return (
                `intent://www.youtube.com/${cleanedLink}#Intent;` +
                `scheme=https;package=com.google.android.youtube;` +
                `S.browser_fallback_url=${YOUTUBE_WEB}${cleanedLink};end`
            );
        default:
            // 데스크탑의 경우 URL 정규화
            if (cleanedLink.startsWith("https://") || cleanedLink.startsWith("http://")) {
                // URL에서 앞의 프로토콜과 중복 슬래시 제거
                cleanedLink = cleanedLink.replace(/^https?:\/\//, "");
            }

            // 쿼리 파라미터 처리
            const [path, query] = cleanedLink.split("?");
            const queryString = query ? `?${query}` : "";

            // YouTube 도메인이 포함된 경우와 아닌 경우를 구분
            return path.includes("youtube.com") || path.includes("youtu.be")
                ? `https://${path}${queryString}`
                : `${YOUTUBE_WEB}${path}${queryString}`;
    }
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
        const redirectLocation = createRedirectUrl(originalLink, deviceType);

        console.log("Device Type:", deviceType);
        console.log("Redirect Location:", redirectLocation);

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
