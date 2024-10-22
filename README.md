# YouTube 링크 리다이렉션 서비스

이 프로젝트는 AWS Lambda와 CloudFront를 사용하여 YouTube 링크를 디바이스 유형에 따라 적절한 앱 또는 웹 페이지로 리다이렉션하는 서비스입니다.

## 주요 기능

- 사용자 디바이스 유형 감지 (iOS, Android, 데스크톱, 기타)
- 디바이스 유형에 따른 맞춤형 리다이렉션
- YouTube 앱이 설치되지 않은 경우 대체 동작 제공

## 사용 방법

YouTube 링크를 공유할 때 다음과 같이 간단히 사용할 수 있습니다:

1. 원래 YouTube 링크 앞에 `link-to.me/`를 붙입니다.
2. 예: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` 대신
   `https://link-to.me/https://www.youtube.com/watch?v=dQw4w9WgXcQ`를 사용합니다.
3. 이 링크를 공유하면 사용자의 디바이스에 따라 적절한 앱이나 웹페이지로 리다이렉션됩니다.

## 기술 스택

- AWS Lambda: 서버리스 함수 실행
- AWS CloudFront: 콘텐츠 전송 및 요청 처리
- JavaScript: 리다이렉션 로직 구현

## 주의사항

- 이 서비스는 YouTube의 이용 약관을 준수해야 합니다.
- 사용자 개인정보 보호에 유의하세요.

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
