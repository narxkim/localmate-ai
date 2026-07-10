# 🛠 Trouble Shooting

## Streaming이 한 번에 출력되는 문제

### 원인

Flux를 일반 Response처럼 처리하였다.

### 해결

ReadableStream으로 chunk를 읽도록 수정하였다.

---

## ChatMemory가 초기화되는 문제

### 원인

conversationId를 매 요청마다 새로 생성하였다.

### 해결

기존 conversationId를 유지하도록 수정하였다.

---

## Tool Calling 미동작

### 원인

@Tool Bean 등록 누락

### 해결

Spring Bean 등록 후 Tool 호출 성공