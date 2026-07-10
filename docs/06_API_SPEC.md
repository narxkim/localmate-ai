# 📡 API Specification

## AI 질문

POST

/api/chat

### Request

```json
{
  "conversationId":"chat-1",
  "city":"BUSAN",
  "language":"EN",
  "question":"Recommend places near Busan Station."
}
```

### Response

Streaming

```
감천문화마을을 추천합니다...
```

---

## 새 대화

POST

/api/chat/reset

---

## 관광지 조회

GET

/api/tour?city=BUSAN

---

## 음식 추천

GET

/api/food