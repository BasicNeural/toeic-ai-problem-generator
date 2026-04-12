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
- **Backend/Database**: Firebase Authentication (Google Login), Cloud Firestore
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
│   ├── useAuth.ts          # Firebase 인증 상태 관리
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

## 🔄 최근 리팩토링 내역

애플리케이션의 규모가 커짐에 따라 다음과 같은 구조적 개선이 이루어졌습니다.

1. **라우팅 시스템 도입 (`react-router-dom`)**: 기존 `useState` 기반의 화면 전환에서 표준 라우팅 시스템으로 전환하여 URL 기반 네비게이션이 가능해졌습니다.
2. **전역 상태 관리 (`AppContext`)**: 각 훅(`useVocabulary`, `useAuth` 등)을 Context API로 묶어 하위 컴포넌트로의 Prop Drilling을 제거했습니다.
3. **컴포넌트 분리 (관심사 분리)**: 비대해진 `MemorizeView`를 `FlashcardPhase`, `QuizPhase`, `ResultPhase`로 분리하여 단일 책임 원칙(SRP)을 준수했습니다.
4. **프롬프트 분리 (`prompts.ts`)**: `geminiService.ts` 내부에 하드코딩되어 있던 프롬프트들을 별도 파일로 분리하여 프롬프트 엔지니어링 및 유지보수를 용이하게 했습니다.
5. **문제 사전 생성 및 영속성 부여**: `useSolve` 훅을 개선하여 생성된 문제를 Firestore에 임시 저장(`pending` 상태)함으로써, 새로고침 시에도 생성된 문제가 날아가지 않도록 개선했습니다.

## 🚀 시작하기

1. Firebase 프로젝트를 설정하고 `firebase-applet-config.json` 파일에 구성을 추가합니다.
2. 환경 변수에 기본 Gemini API 키(`GEMINI_API_KEY`)가 설정되어 있는지 확인합니다. (추가 키는 앱 내 설정에서 등록 가능)
3. `npm install` 명령어로 의존성을 설치합니다.
4. `npm run dev` 명령어로 개발 서버를 실행합니다.
