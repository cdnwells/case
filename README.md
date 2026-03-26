# Echo — AI 음성 에이전트 시스템

개인용 AI 비서 **Echo**의 풀스택 시스템입니다. 음성 명령과 텍스트 채팅을 통해 AI와 대화하고, 로컬 머신에서 명령을 실행할 수 있습니다.

## 데모

### 데스크톱 브라우저

https://github.com/user-attachments/assets/0326_desk_dc_001.mp4

<video src="repo/0326_desk_dc_001.mp4" controls width="100%"></video>

### 모바일 브라우저

https://github.com/user-attachments/assets/0326_mobile_dc_001.mp4

<video src="repo/0326_mobile_dc_001.mp4" controls width="100%"></video>

## 아키텍처

**Hub-and-Spoke** 구조로, 중앙 Hub가 리버스 프록시 역할을 하며 각 Worker(Spoke)에 요청을 라우팅합니다.

```
┌─────────────────┐
│  Android Client  │
│  (Expo / React   │
│   Native)        │
└────────┬────────┘
         │
    ┌────▼────┐
    │   Hub   │  Node.js / Fastify (port 5000)
    └──┬──┬──┬┘
       │  │  │
  ┌────┘  │  └────┐
  ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌──────┐
│ GPT │ │ Ctx │ │Claude│  Python / FastAPI
│:8000│ │:8001│ │:8003 │
└─────┘ └─────┘ └──────┘
```

| Worker | 포트 | 역할 |
|--------|------|------|
| GPT | 8000 | OpenAI GPT 기반 채팅 처리 |
| Context | 8001 | 대화 컨텍스트 및 메모리 저장/조회 |
| Claude | 8003 | Claude Code CLI를 통한 로컬 명령 실행 |
| Ollama | — | 로컬 LLM(Ollama) 기반 채팅 |
| SSH | — | 원격 서버 명령 실행 |

## 주요 기능

- **음성 입력 & 웨이크워드 감지** — "에코" 호출 시 자동 음성 인식 시작, 레인보우 글로우 효과
- **TTS 응답** — AI 응답을 음성으로 출력
- **컨텍스트 메모리** — 대화 맥락을 기억하고 활용
- **명령 실행** — 자연어로 로컬/원격 머신 명령 수행 (fire-and-forget + 결과 폴링)
- **생체 인증** — 앱 실행 시 지문/얼굴 인식 잠금
- **배터리 최적화 해제** — 백그라운드 음성 감지를 위한 자동 권한 요청

## 기술 스택

| 영역 | 기술 |
|------|------|
| 클라이언트 | React Native, Expo SDK 54, TypeScript |
| Hub | Node.js, Fastify |
| Workers | Python, FastAPI |
| AI | OpenAI GPT, Claude Code CLI, Ollama |
| 인프라 | Hub-and-Spoke 리버스 프록시 |

## 프로젝트 구조

```
case/
├── hub/              # 중앙 라우팅 서버
├── workers/
│   ├── gpt/          # GPT 채팅 워커
│   ├── context/      # 컨텍스트 메모리 워커
│   ├── claude/       # Claude Code 명령 워커
│   ├── ollama/       # Ollama 로컬 LLM 워커
│   └── ssh/          # SSH 원격 명령 워커
└── android/          # Expo React Native 앱
```

## 연락처

[![Gmail](https://img.shields.io/badge/Gmail-cdnwellhk@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:cdnwellhk@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-cdnwells-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/cdnwells)