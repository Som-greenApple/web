# 🍏 GreenStep
 
도착하면 딱, 초록불
 
신호등 앞에 도착했는데 빨간불이라 멍하니 기다리거나, 깜빡이는 초록불을 보고 뛰어본 적 있나요? GreenStep은 내가 횡단보도에 도착하는 순간 **초록불로 딱 바뀌도록** 걷는 속도를 맞춰주는 모바일 웹앱입니다.
 
현재 위치, 나의 보행 속도, 서울시 실시간 신호 정보를 비교해서 "조금 천천히 걸어도 돼요"처럼 지금 어떻게 걸으면 되는지 알려줍니다. 기다리지도, 뛰지도 않고 걷던 그대로 건너는 게 목표예요. 이번 신호에 맞추려면 뛰어야 하는 상황이라면 무리하지 말고 다음 신호를 기다리라고 안내합니다.
 
신호 상태는 사과로 보여줍니다. 🍏 초록사과는 건너도 됨, 한 입 베어 문 깜빡사과는 점멸, 🍎 빨간사과는 대기, ❔ 모르는사과는 신호 정보 없음입니다.
 
## 🛠 기술 스택
 
React TypeScript Vite TailwindCSS Vercel
 
| 분야 | 스택 |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| 지도 / 위치 | Kakao Maps JavaScript SDK, Geolocation API |
| Backend | Vercel Serverless Function (신호 API 프록시) |
| External API | 서울 T Data C-ITS 신호제어기 신호 잔여시간 정보, 교차로 Map 정보 |
| Test | Vitest |
 
## 📁 폴더 구조
 
```text
api/
  signal.ts       # 신호 API 프록시 (API 키 보관)
src/
  pages/          # 화면 단위 컴포넌트 (MainPage, CrosswalkPage, ResultPage)
  components/     # 재사용 UI 컴포넌트 (StrategyCard, SignalBadge 등)
  features/
    map/          # 지도, GPS, 주변 횡단보도
    signal/       # 신호 불러오기, 해석, 카운트다운
    strategy/     # 보행 속도 측정, 예측 알고리즘
  data/           # 대상 횡단보도 목록 (crosswalks.json)
  context/        # 전역 상태
  config/         # 환경변수
  lib/            # 거리 계산 등 유틸
  types/          # TypeScript 타입 정의
  App.tsx
  main.tsx
tests/            # 예측 알고리즘, 신호 파서 테스트
```
 
## 🚀 실행 방법
 
저장소 클론
 
```bash
git clone [저장소 URL]
cd greenstep
```
 
패키지 설치
 
```bash
npm install
```
 
환경변수 설정
 
- 프로젝트 루트에 `.env` 파일 생성
- `.env.example` 참고해서 값 채우기 (팀 내부 공유)
  - `VITE_KAKAO_JS_KEY`: Kakao JavaScript 키 (Kakao Developers에 `http://localhost:5173` 도메인 등록 필요)
  - `VITE_DATA_MODE`: `mock` / `replay` / `live`
  - `TDATA_API_KEY`: 서울 T Data 인증키. 브라우저에 노출되면 안 되므로 `VITE_`를 붙이지 않음
개발 서버 실행
 
```bash
npm run dev       # 화면만 개발할 때 (mock 신호)
npx vercel dev    # 실제 신호 API까지 쓸 때 (Vercel Function 포함)
```
 
→ http://localhost:5173 접속
 
- `npm run dev`만 띄우면 `/api/signal`이 없어서 실시간 신호를 못 받는다. live 모드로 확인하려면 `vercel dev`로 띄우기
- 주소 끝에 `?demo=1`을 붙이면 데모 패널이 열린다 (가짜 신호, 가상 걷기, 신호 강제 전환)
- 횡단보도는 `src/data/crosswalks.json`에서 관리한다. 현장에서 실제 신호와 맞는지 확인하기 전까지는 `verified: false`로 두고, 이 상태면 실시간 예측을 하지 않는다
요구 사항
 
- Node.js 18 이상
- Vercel CLI 전역 설치 (`npm install -g vercel`), `vercel login` 완료
## 🌿 Git 브랜치 전략 / 커밋 컨벤션
 
GIT_FLOW.md 참고
 