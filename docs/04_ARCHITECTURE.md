# 🏗 System Architecture

```mermaid
flowchart LR

A[User]

B[HTML / JS]

C[Spring Boot]

D[Spring AI]

E[Tool Calling]

F[(PostgreSQL)]

G[Gemini]

A --> B
B --> C
C --> D
D --> G

D --> E

E --> F

G --> B
```

---

## Spring AI 구성

- ChatClient
- ChatMemory
- Streaming
- Tool Calling