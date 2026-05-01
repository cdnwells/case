# Case — AI 음성 에이전트 시스템

개인용 AI 비서 **Case**의 풀스택 시스템입니다. 음성 명령과 텍스트 채팅을 통해 AI와 대화하고, 로컬 머신에서 명령을 실행할 수 있습니다.

## 데모

![Demo](repo/case_001.gif)

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
│ GPT │ │ Ctx │ │Codex │  Python / FastAPI
│:8000│ │:8001│ │:8004 │
└─────┘ └─────┘ └──────┘
```

| Worker  | 포트 | 역할                                  |
| ------- | ---- | ------------------------------------- |
| GPT     | 8000 | OpenAI GPT 기반 채팅 처리             |
| Context | 8001 | 대화 컨텍스트 및 메모리 저장/조회     |
| Ollama  | 8002 | 로컬 LLM(Ollama) 기반 채팅            |
| Claude  | 8003 | Claude Code CLI 기반 레거시 명령 실행 |
| Codex   | 8004 | Codex CLI를 통한 로컬 명령 실행       |
| SSH     | 8005 | 원격 서버 명령 실행                   |

## 주요 기능

- **음성 입력 & 웨이크워드 감지** — "케이스" 호출 시 자동 음성 인식 시작, 레인보우 글로우 효과
- **TTS 응답** — AI 응답을 음성으로 출력
- **컨텍스트 메모리** — 대화 맥락을 기억하고 활용
- **명령 실행** — 자연어로 로컬/원격 머신 명령 수행 (fire-and-forget + 결과 폴링)
- **생체 인증** — 앱 실행 시 지문/얼굴 인식 잠금
- **배터리 최적화 해제** — 백그라운드 음성 감지를 위한 자동 권한 요청

## 기술 스택

| 영역       | 기술                                  |
| ---------- | ------------------------------------- |
| 클라이언트 | React Native, Expo SDK 54, TypeScript |
| Hub        | Node.js, Fastify                      |
| Workers    | Python, FastAPI                       |
| AI         | OpenAI GPT, Codex CLI, Claude Code CLI, Ollama |
| 인프라     | Hub-and-Spoke 리버스 프록시           |

## 프로젝트 구조

```
case/
├── hub/              # 중앙 라우팅 서버
├── workers/
│   ├── gpt/          # GPT 채팅 워커
│   ├── context/      # 컨텍스트 메모리 워커
│   ├── codex/        # Codex CLI 명령 워커
│   ├── claude/       # Claude Code 명령 워커
│   ├── ollama/       # Ollama 로컬 LLM 워커
│   └── ssh/          # SSH 원격 명령 워커
└── android/          # Expo React Native 앱
```

## 서버 실행

루트에서 `run_servers.sh`를 실행하면 Hub와 기본 워커(GPT, Context, Codex, Ollama, SSH)를 함께 시작합니다. `/command`는 기본적으로 Codex 워커로 라우팅됩니다.

```bash
./run_servers.sh
```

자주 쓰는 옵션:

```bash
./run_servers.sh --workers core
./run_servers.sh --only hub,gpt,codex
./run_servers.sh --exclude ssh,ollama
./run_servers.sh --executor claude --workers core
./run_servers.sh --codex-port 8014 --dry-run
```

## 연락처

[![Gmail](https://img.shields.io/badge/Gmail-cdnwellhk@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:cdnwellhk@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-cdnwells-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/cdnwells)
