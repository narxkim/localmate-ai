# 🧭 11_USER_FLOW.md

# User Flow

## 서비스 목적

외국인 관광객이 여러 앱을 오가지 않고,
하나의 AI 서비스에서 필요한 관광 정보를 얻을 수 있도록 한다.

---

# User Journey

```text
서비스 접속

↓

지역 선택
(Busan / Gyeongju)

↓

답변 언어 선택

↓

질문 입력

↓

AI 질문 분석

↓

Tool Calling 여부 판단

↓

관광 데이터 조회

↓

LLM 응답 생성

↓

Streaming 출력

↓

Chat Memory 저장

↓

후속 질문

↓

이전 대화 기반 응답
```

---

# 사용자 흐름

## 1. 지역 선택

사용자는

- Busan
- Gyeongju

중 하나를 선택한다.

↓

AI는 해당 지역을 기준으로 답변한다.

---

## 2. 질문 입력

예시

> I want to visit Busan for 2 days.

↓

Spring AI

↓

Prompt 생성

---

## 3. Tool Calling

질문이

- 관광지
- 음식
- 교통

관련이면

Tool을 호출한다.

예)

```text
Question

↓

Tool

↓

TourSpot

↓

Response
```

---

## 4. Streaming

AI 응답은

토큰 단위로 출력된다.

---

## 5. Chat Memory

사용자가

> Which one is closest?

라고 질문하면

이전 추천 관광지를 기억한다.

---

# 종료

새 대화를 누르면

conversationId를 새로 생성한다.