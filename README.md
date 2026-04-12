# 📘 토익 마스터 (TOEIC Master)

토익 마스터는 AI를 활용하여 사용자의 영단어 암기와 토익 파트 5 문법 실력 향상을 돕는 맞춤형 학습 애플리케이션입니다. FSRS 알고리즘을 통한 효율적인 단어 암기, AI 기반 맞춤형 퀴즈 및 문법 문제 생성 기능을 제공합니다.

## ✨ 주요 기능

- **단어장 관리 및 동기화**: CSV 파일을 통해 단어를 업로드하고, Firebase를 통해 모든 기기에서 학습 데이터를 안전하게 동기화합니다.
- **FSRS 기반 단어 암기 (Spaced Repetition)**: 망각 곡선에 기반한 FSRS(Free Spaced Repetition Scheduler) 알고리즘을 적용하여 최적의 주기로 단어를 복습합니다.
- **AI 맞춤형 단어 퀴즈**: 사용자가 방금 학습한 단어들을 바탕으로 Gemini API가 문맥에 맞는 객관식 퀴즈를 자동 생성합니다.
- **AI 파트 5 문제 생성 (취약점 분석)**: 사용자의 문법 통계(Radar Chart)를 분석하여 취약한 문법 유형과 암기한 단어를 조합한 실전 토익 파트 5 문제를 무한 생성합니다.
- **다중 API 키 관리 및 자동 로테이션**: Gemini API의 Rate Limit(429 에러) 발생 시, 등록된 다음 API 키로 자동 전환(Rotation)하여 학습 흐름이 끊기지 않도록 지원합니다.
- **문제 사전 생성 (Pre-generation)**: 파트 5 문제 생성 시 대기 시간을 줄이기 위해 백그라운드에서 문제를 미리 생성하여 Firestore에 저장해 둡니다.

## 🛠 기술 스택

- **Frontend**: React 18, TypeScript, Vite
- **Styling & Animation**: Tailwind CSS, Framer Motion, Recharts, Lucide React
- **Routing & State**: React Router DOM, Context API (`AppContext`)
- **Backend/Database**: Cloud Firestore (사용자 Firebase 프로젝트)
- **AI Integration**: Google Gemini API (`@google/genai`)

## 📁 프로젝트 구조

프로젝트는 유지보수성과 확장성을 고려하여 다음과 같이 모듈화되어 있습니다.

```text
src/
├── components/
│   ├── views/          # 라우팅되는 메인 페이지 컴포넌트 (HomeView, MemorizeView, SolveView, VocabQuizView)
│   │   └── memorize/   # MemorizeView의 하위 단계 컴포넌트 (FlashcardPhase, QuizPhase, ResultPhase)
│   ├── modals/         # 모달 컴포넌트 (SettingsModal, ConfirmModal, MemorizedWordsModal)
│   └── ui/             # 재사용 가능한 공통 UI 컴포넌트 (Toast, ErrorBoundary 등)
├── contexts/
│   └── AppContext.tsx  # 전역 상태 관리를 위한 Context Provider (Prop Drilling 방지)
├── hooks/              # 비즈니스 로직을 캡슐화한 커스텀 훅
│   ├── useVocabulary.ts    # 단어 데이터, CSV 업로드, Firestore 동기화 관리
│   ├── useMemorize.ts      # FSRS 단어 암기 세션 로직
│   ├── useVocabQuiz.ts     # AI 단어 퀴즈 세션 로직
│   ├── useSolve.ts         # AI 파트 5 문제 사전 생성 및 풀이 로직
│   └── useGrammarStats.ts  # 문법 취약점 통계 관리
├── services/
│   └── geminiService.ts    # Gemini API 통신, 재시도 로직, API 키 로테이션 처리
├── lib/                # 유틸리티 함수 및 설정 파일
│   ├── prompts.ts          # AI 프롬프트 문자열 중앙 관리
│   ├── apiKeyManager.ts    # 다중 API 키 상태 및 로컬 스토리지 관리
│   ├── fsrs.ts             # FSRS 알고리즘 구현체
│   └── utils.ts            # Tailwind 클래스 병합 등 공통 유틸
├── types.ts            # 전역 TypeScript 인터페이스 및 타입 정의
├── firebase.ts         # Firebase 초기화 및 설정
└── App.tsx             # 애플리케이션 진입점 (Provider 및 Router 설정)
```

## 🧠 단어 선택 알고리즘

학습 세션 시작 시 `useMemorize` 훅이 아래 로직으로 최대 10개의 단어를 선택합니다.

### 1단계: 일일 신규 단어 한도 계산

- 하루 기준은 **KST 오전 6시**에 리셋됩니다. (`lib/time.ts`)
- 오늘 이미 소개된 단어 수(`introducedAt` 기준)를 세고, **일일 상한 10개**에서 차감합니다.
- `remainingNewWords = max(0, 10 - introducedTodayCount)`

### 2단계: 신규 + 복습 단어 구성

| 구분 | 대상 | 정렬 |
|---|---|---|
| **신규** | `fsrs` 필드가 없는 단어 | 랜덤 셔플 |
| **복습** | `fsrs.due ≤ 현재시각`인 단어 | due 오름차순 (오래된 것 우선) |

세션 10개를 채우는 우선순위:

1. 신규 최대 2개 배정 → 남은 슬롯에 복습 배정
2. 슬롯이 남으면 신규를 추가 배정 (일일 한도 내)
3. 그래도 남으면 복습을 추가 배정

### 3단계: 새로운 단어 더 학습하기 (폴백)

신규·복습 단어가 모두 0개인 경우, **미학습 신규 단어 최대 2개** + **학습 완료 단어**(`fsrs.state > 0`)에서 랜덤으로 나머지를 채워 세션을 구성합니다. 홈 화면에는 "새로운 단어 더 학습하기"로 표시됩니다.

### 3.5단계: 복습 시간 미도래 단어로 보충

3단계까지 완료 후에도 10개 미만이면, 아직 복습 시간이 되지 않은 단어(`fsrs.due > 현재시각`)를 **due 오름차순**으로 나머지 슬롯에 채웁니다.

### 4단계: 세션 진행

선택된 단어들은 랜덤 셔플 후 **플래시카드 → AI 퀴즈 → 결과** 3단계로 진행됩니다. 플래시카드 단계에서의 스와이프 속도·실패 횟수에 따라 FSRS 평가(Easy/Good/Hard/Again)가 자동 결정됩니다.

| 조건 | 평가 |
|---|---|
| 뒤집기 실패 2회 이상 | Again |
| 실패 1회 또는 30초 초과 | Hard |
| 10초 이내 | Easy |
| 그 외 | Good |

퀴즈에서 오답 시 최종 평가가 **Again**으로 덮어씌워집니다.

## 🚀 시작하기

1. https://basicneural.github.io/toeic-ai-problem-generator/ 에 접속합니다.
2. Firebase 콘솔에서 프로젝트를 생성하고, Firestore Database를 활성화합니다.
3. 앱 초기 설정 화면에서 Firebase config를 붙여넣고, 안내에 따라 Firestore 보안 규칙을 설정합니다.
4. [Google AI Studio](https://aistudio.google.com/apikey)에서 Gemini API 키를 발급받아 입력합니다.
5. CSV 파일로 단어를 업로드하면 학습을 시작할 수 있습니다.
