# 📘 토익 마스터 (TOEIC Master)

토익 마스터는 AI를 활용하여 사용자의 영단어 암기와 토익 파트 5 문법 실력 향상을 돕는 맞춤형 학습 애플리케이션입니다. FSRS 알고리즘을 통한 효율적인 단어 암기, AI 기반 맞춤형 퀴즈 및 0.1초 대기 없는 파트 5 문제 공급 기능을 제공합니다.

## ✨ 주요 기능

- **FSRS 기반 단어 암기 (Spaced Repetition)**: 망각 곡선에 기반한 FSRS(Free Spaced Repetition Scheduler) 알고리즘을 적용하여 최적의 주기로 단어를 복습합니다.
- **KST 06:00 일일 리셋**: 한국 시간 오전 6시를 기준으로 "오늘의 신규 학습" 한도가 리셋되어 무리하지 않는 꾸준한 학습을 유도합니다.
- **실시간 백그라운드 문제 큐 (Part 5)**: 대기 중인 문제를 Firestore에 항상 **3개** 유지합니다. 사용자가 문제를 푸는 즉시 백그라운드에서 다음 문제를 생성하여 AI 생성 대기 시간을 제거했습니다.
- **오프라인 우선 (Persistent Cache)**: Firebase의 로컬 캐시를 활성화하여 인터넷 연결이 불안정한 환경에서도 끊김 없는 학습 환경을 보장합니다.
- **AI 맞춤형 문제 생성**: Gemini API가 사용자의 문법 취약점(Radar Chart)과 암기한 단어를 조합하여 실제 토익과 유사한 파트 5 문제를 무한 생성합니다.
- **다중 API 키 로테이션**: Rate Limit 발생 시 등록된 다음 API 키로 자동 전환되어 학습 흐름이 끊기지 않습니다.

## 🛠 기술 스택

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion, Recharts
- **Database**: Firebase Cloud Firestore (with Offline Persistence)
- **AI Integration**: Google Gemini API (`@google/genai`)

## 🧠 학습 알고리즘 상세

### 1. 단어 선택 알고리즘 (Word Selection)

`useMemorize` 훅은 매 세션마다 다음 3단계 로직을 통해 **최대 10개**의 학습 카드를 추출합니다.

#### **1단계: 일일 신규 학습 한도 체크**
*   기준 시간: **KST 오전 06:00** 리셋.
*   오늘 이미 학습을 시작한 신규 단어(`introducedAt` 기준)가 **10개** 미만인지 확인합니다.

#### **2단계: 단어 추출 및 세션 구성**
*   **Case A: 신규 한도가 남은 경우 (혼합 학습)**
    1.  **신규 단어**: 아직 학습 이력이 없는 단어 중 **최대 2개**를 우선 선택합니다.
    2.  **복습 단어**: 나머지 슬롯은 복습 주기(`fsrs.due`)가 현재 시각 이전인 단어들을 **오래된 순(asc)**으로 채웁니다.
    3.  **보충**: 복습 단어가 부족하면 일일 한도 내에서 신규 단어를 더 가져와 10개를 채웁니다.
*   **Case B: 신규 한도를 초과했거나 복습할 단어만 있는 경우 (복습 집중)**
    1.  **연체 복습**: 복습 주기가 지난 단어들을 **오래된 순**으로 최대 10개 가져옵니다.
    2.  **예외 보충 (Fallback)**: 복습할 단어가 10개 미만이면, 아직 복습 시간이 되지 않은 단어들을 **가장 가까운 주기 순**으로 가져와 세션을 완성합니다.

#### **3단계: 세션 최적화 및 요약**
| 우선순위 | 구분 | 대상 조건 | 정렬 방식 |
| :--- | :--- | :--- | :--- |
| **1순위** | 신규 단어 | `fsrs == null` (최대 2개) | 랜덤 셔플 |
| **2순위** | 복습 단어 | `fsrs.due` ≤ 현재 시각 | `due` 오름차순 (오래된 순) |
| **3순위** | 신규 보충 | `fsrs == null` (일일 한도 내) | 랜덤 셔플 |
| **4순위** | 예약 보충 | `fsrs.due` > 현재 시각 | `due` 오름차순 (가까운 순) |

### 2. 파트 5 백그라운드 문제 공급 (Queue)

사용자가 문제 풀이 화면(`SolveView`)에 진입하면 `useSolve` 훅이 다음 과정을 자동으로 수행합니다.

-   **컬렉션 자동 관리**: `problems` 컬렉션이 없으면 첫 문제 생성 시 자동으로 생성됩니다.
-   **무결점 큐 유지**: Firestore의 `pending` 상태 문제를 실시간 감시하며, 개수가 3개 미만으로 떨어지면 AI가 즉시 새로운 문제를 보충합니다.
-   **메모리 정렬 최적화**: Firestore의 복합 인덱스 의존도를 낮추기 위해 생성 시간순 정렬을 클라이언트 메모리에서 수행하여, 설정 없이도 즉시 작동합니다.

## 📁 프로젝트 구조 요약

```text
src/
├── components/         # UI 컴포넌트 및 학습 단계별 뷰
├── contexts/           # AppContext (전역 상태 관리)
├── hooks/              # 핵심 비즈니스 로직
│   ├── useMemorize.ts      # FSRS 단어 선택 및 세션 관리
│   ├── useSolve.ts         # 백그라운드 문제 큐 및 풀이 로직
│   └── useVocabulary.ts    # 데이터 동기화 및 통계 요약
├── services/           # Gemini API 통신 및 워크플로우
├── lib/                # 유틸리티 (FSRS, KST 시간 로직, 프롬프트)
└── firebase.ts         # 로컬 캐시 활성화 및 DB 설정
```

## 🚀 시작하기

1. [토익 마스터](https://basicneural.github.io/toeic-ai-problem-generator/) 접속
2. Firebase Console에서 프로젝트 생성 및 Config 입력
3. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급 및 설정
4. CSV로 단어 업로드 후 즉시 학습 시작
