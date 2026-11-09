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
 
## 메인 화면 지도

MapLibre와 OpenFreeMap의 전 세계 벡터 타일로 현재 위치 주변의 실제 도로를 흑백 블록 스타일로 표시합니다.
건물·상점·지명은 생략하고 도로 사이를 하나의 빈 블록으로 표시합니다. 카카오 키는 이 지도에 필요하지 않습니다.

- 첫 진입 시 위치 권한을 요청하고 `watchPosition`으로 받은 GPS 위치에 지도를 맞춥니다. 특정 지역 범위 제한이 없습니다.
- 지도에 내 위치를 졸라맨으로 표시합니다. 직접 지도를 드래그하면 자동 중심 이동을 멈추고, ‘내 위치’를 누르면 다시 따라갑니다.
- 위치 거부·오류 시 권한 설정 안내와 재시도를 제공하며, 사용자가 기본 위치를 선택하면 동덕여대 주변을 표시합니다.
- 도로 타일은 인터넷 연결이 필요합니다. 지도 로드 실패 시 재시도할 수 있습니다. WebGL을 지원하는 브라우저가 필요합니다.
- 횡단보도 목록은 현재 등록된 동덕여대 주변 데이터이며, 전 세계 횡단보도 검색은 제공하지 않습니다. `crosswalks.json`에 좌표가 있는 항목만 사과로 표시하고 선택 시 `/crosswalk/:id`로 이동합니다.
- 신호가 없거나 미확인인 횡단보도는 모르는 사과로 표시합니다. 현재 횡단보도 좌표는 미등록 상태입니다.

지도 제공: [OpenFreeMap](https://openfreemap.org/quick_start/), © OpenMapTiles, © OpenStreetMap contributors.
기존 카카오 지도 컴포넌트는 유지하지만 메인 화면에서는 사용하지 않습니다.
테스트: `node --test tests/*.test.mjs` (Node.js 22.18 이상).


## 신호 API 연동 (#7)

- `/api/signal?itstId=교차로ID&direction=방향`은 서버의 `TDATA_API_KEY`로 T Data를 호출합니다.
- 키 이름에 `VITE_`를 붙이지 않으며, `.env.local`이나 키 값을 커밋하지 않습니다.
- 로컬은 키가 설정된 동일한 터미널에서 `npx vercel dev`를 실행합니다. Windows에서 심볼릭 링크 권한 오류가 나면 관리자 PowerShell을 사용합니다.
- Vercel 배포 시 프로젝트 환경변수에 `TDATA_API_KEY`를 추가하고 사용할 Preview/Production 환경을 선택한 뒤 새로 배포합니다. 로컬 PowerShell 환경변수는 배포 서버로 전달되지 않습니다.
- 메인 화면의 데이터 모드에서 실시간을 선택하면, `verified: true`이며 `signalIntersectionId`와 `signalDirection`이 유효한 항목만 조회합니다.
- 조회 완료 후 10초 간격으로 갱신하며 같은 교차로·방향은 한 번만 요청합니다. 실제 이용 전 발급받은 API 호출 한도에 맞춰 간격을 조정해야 합니다.
- 화면 이동과 모드 전환 시 요청을 취소합니다. 실패 시 이전 신호를 재사용하지 않습니다.
- 정보 경과 10~30초는 지연, 30초 초과는 사용 불가입니다. 잔여시간 만료 시 다음 신호를 추측하지 않고 UNKNOWN으로 전환합니다.
- mock의 안내 시나리오는 live 화면에 적용하지 않습니다. replay는 준비 중 안내를 표시합니다.
- `/signal-test`는 교차로 20386의 ne 보행 신호를 수동 조회하는 개발용 화면이며, 실제 등록 횡단보도의 검증을 대체하지 않습니다.
- 현재 등록된 3곳은 위치·신호 매핑 미확인 상태입니다. 값을 임의로 채우거나 verified를 true로 변경하지 않습니다.
- 점멸 상태의 서울 API 매핑과 실제 횡단보도 신호 대응 관계는 아직 확인이 필요합니다. 서울 전체 횡단보도 검색은 이 작업에 포함되지 않습니다.
- 검사: `npm run build`, `npm run lint`, `node --test tests/*.test.mjs`
