document.addEventListener("DOMContentLoaded", () => {

    const regionSelect = document.getElementById("region");
    const languageSelect = document.getElementById("language");
    const chatHistory = document.getElementById("chatHistory");

    const messageInput = document.getElementById("message");
    const sendBtn = document.getElementById("sendBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const conversationStatus = document.getElementById("conversationStatus");

    const STORAGE_KEY = "localmate-conversation-id";

    let conversationId = getOrCreateConversationId();
    let isStreaming = false;
    let abortController = null;

    updateConversationStatus();

    sendBtn.addEventListener("click", sendMessage);

    newChatBtn.addEventListener("click", startNewChat);

    messageInput.addEventListener("keydown", event => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener("input", resizeTextarea);

    /**
     * 저장된 대화 ID를 가져오거나 새로 생성한다.
     */
    function getOrCreateConversationId() {
        const savedId = localStorage.getItem(STORAGE_KEY);

        if (savedId) {
            return savedId;
        }

        const newId = crypto.randomUUID();

        localStorage.setItem(STORAGE_KEY, newId);

        return newId;
    }

    /**
     * 새 대화를 시작한다.
     */
    function startNewChat() {
        if (abortController) {
            abortController.abort();
        }

        conversationId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, conversationId);

        isStreaming = false;
        setInputDisabled(false);

        chatHistory.innerHTML = `
            <div class="message ai-message">
                <div class="message-profile">AI</div>
        
                <div class="message-content">
                    <div class="message-name">LocalMate AI</div>
                    <div class="message-bubble">
                        새로운 대화를 시작했습니다.<br>
                        지역과 답변 언어를 선택한 뒤 질문해 주세요.
                    </div>
                </div>
            </div>
        `;

        messageInput.value = "";
        resizeTextarea();
        updateConversationStatus();

        messageInput.focus();
    }

    /**
     * 사용자의 메시지를 전송한다.
     */
    async function sendMessage() {
        const message = messageInput.value.trim();

        if (!message || isStreaming) {
            return;
        }

        const requestBody = {
            conversationId: conversationId,
            region: regionSelect.value,
            language: languageSelect.value,
            message: message
        };

        appendUserMessage(message);

        messageInput.value = "";
        resizeTextarea();

        const aiBubble = appendAiMessage();
        aiBubble.classList.add("streaming");

        isStreaming = true;
        setInputDisabled(true);

        abortController = new AbortController();

        try {
            const response = await fetch("/api/chats/stream", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream"
                },

                body: JSON.stringify(requestBody),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            if (!response.body) {
                throw new Error("스트리밍 응답을 읽을 수 없습니다.");
            }

            await readEventStream(response, aiBubble);

            if (!(aiBubble.dataset.markdown ?? "").trim()) {
                aiBubble.textContent = "응답 내용이 없습니다.";
            } else {
                addPdfDownloadButton(aiBubble, requestBody);
            }

        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }

            console.error("채팅 요청 실패:", error);

            aiBubble.textContent =
                "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

            aiBubble.classList.add("error-message");

        } finally {
            aiBubble.classList.remove("streaming");

            isStreaming = false;
            abortController = null;

            setInputDisabled(false);
            messageInput.focus();
        }
    }

    /**
     * SSE 응답을 읽어 AI 말풍선에 실시간으로 출력한다.
     */
    async function readEventStream(response, aiBubble) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let buffer = "";

        while (true) {
            const {value, done} = await reader.read();

            if (done) {
                buffer += decoder.decode();

                if (buffer.trim()) {
                    processSseBlock(buffer, aiBubble);
                }

                break;
            }

            buffer += decoder.decode(value, {stream: true});

            const blocks = buffer.split(/\r?\n\r?\n/);

            buffer = blocks.pop() ?? "";

            blocks.forEach(block => {
                processSseBlock(block, aiBubble);
            });
        }
    }

    /**
     * SSE 블록에서 데이터를 추출해 Markdown으로 출력한다.
     */
    function processSseBlock(block, aiBubble) {
        const data = block
            .split(/\r?\n/)
            .filter(line => line.startsWith("data:"))
            .map(line => line.substring(5))
            .join("\n");

        if (!data || data === "[DONE]") {
            return;
        }

        const currentMarkdown = aiBubble.dataset.markdown ?? "";
        const updatedMarkdown = currentMarkdown + data;

        aiBubble.dataset.markdown = updatedMarkdown;

        renderMarkdown(aiBubble, updatedMarkdown);
        scrollToBottom();
    }

    function renderMarkdown(element, markdown) {
        if (
            typeof marked === "undefined" ||
            typeof DOMPurify === "undefined"
        ) {
            element.textContent = markdown;
            return;
        }

        const normalizedMarkdown = markdown
            // 이스케이프된 Markdown 기호 복원
            .replace(/\\([#*_])/g, "$1")

            // 제목 앞 공백 제거 및 # 뒤 공백 보장
            .replace(
                /^[ \t]*(#{1,6})[ \t]*/gm,
                (_, hashes) => `${hashes} `
            );

        const renderedHtml = marked.parse(normalizedMarkdown, {
            breaks: true,
            gfm: true
        });

        element.innerHTML = DOMPurify.sanitize(renderedHtml);

        configureMarkdownLinks(element);
    }

    function configureMarkdownLinks(element) {
        const links = element.querySelectorAll("a");

        links.forEach(link => {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });
    }

    /**
     * AI 답변 아래에 PDF 저장 버튼을 추가한다.
     */
    function addPdfDownloadButton(aiBubble, requestBody) {
        const messageContent = aiBubble.closest(".message-content");

        if (!messageContent) {
            return;
        }

        const actions = document.createElement("div");
        actions.className = "message-actions";

        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "pdf-download-button";
        pdfButton.textContent = "PDF 저장";

        pdfButton.addEventListener("click", async () => {
            pdfButton.disabled = true;
            pdfButton.textContent = "PDF 생성 중";

            try {
                await downloadAnswerAsPdf(
                    aiBubble,
                    requestBody
                );
            } catch (error) {
                console.error("PDF 생성 실패:", error);
                alert("PDF 파일을 생성하지 못했습니다.");
            } finally {
                pdfButton.disabled = false;
                pdfButton.textContent = "PDF 저장";
            }
        });

        actions.appendChild(pdfButton);
        messageContent.appendChild(actions);
    }


    /**
     * 선택한 AI 답변을 PDF 파일로 생성한다.
     */
    async function downloadAnswerAsPdf(aiBubble, requestBody) {
        if (typeof html2pdf === "undefined") {
            throw new Error("html2pdf 라이브러리를 찾을 수 없습니다.");
        }

        const regionName = getRegionName(requestBody.region);
        const languageName = getLanguageName(requestBody.language);
        const createdAt = formatDateTime(new Date());

        const pdfDocument = document.createElement("div");
        pdfDocument.className = "pdf-document";

        const title = document.createElement("h1");
        title.className = "pdf-title";
        title.textContent = "LocalMate AI 여행 추천";

        const meta = document.createElement("div");
        meta.className = "pdf-meta";

        const regionMeta = document.createElement("p");
        regionMeta.textContent = `지역: ${regionName}`;

        const languageMeta = document.createElement("p");
        languageMeta.textContent = `답변 언어: ${languageName}`;

        const dateMeta = document.createElement("p");
        dateMeta.textContent = `생성일: ${createdAt}`;

        meta.append(
            regionMeta,
            languageMeta,
            dateMeta
        );

        const divider = document.createElement("hr");

        const content = document.createElement("div");
        content.className = "pdf-content";

        // DOMPurify로 정제된 AI 답변만 복사
        content.innerHTML = aiBubble.innerHTML;

        pdfDocument.append(
            title,
            meta,
            divider,
            content
        );

        /*
         * 화면 밖에 배치해야 html2canvas가
         * 실제 스타일과 크기를 계산할 수 있다.
         */
        const pdfContainer = document.createElement("div");
        pdfContainer.className = "pdf-render-container";
        pdfContainer.appendChild(pdfDocument);

        document.body.appendChild(pdfContainer);

        const date = new Date()
            .toISOString()
            .slice(0, 10);

        const fileName =
            `localmate-${requestBody.region.toLowerCase()}-${date}.pdf`;

        const options = {
            margin: [12, 12, 12, 12],

            filename: fileName,

            image: {
                type: "jpeg",
                quality: 0.98
            },

            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            },

            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },

            pagebreak: {
                mode: ["css", "legacy"],
                avoid: [
                    "table",
                    "tr",
                    "blockquote",
                    "pre"
                ]
            }
        };

        try {
            await html2pdf()
                .set(options)
                .from(pdfDocument)
                .save();
        } finally {
            pdfContainer.remove();
        }
    }

    function getRegionName(region) {
        const regionNames = {
            BUSAN: "부산",
            GYEONGJU: "경주"
        };

        return regionNames[region] ?? region;
    }

    function getLanguageName(language) {
        const languageNames = {
            KOREAN: "한국어",
            ENGLISH: "English",
            JAPANESE: "日本語",
            CHINESE: "中文"
        };

        return languageNames[language] ?? language;
    }

    function formatDateTime(date) {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    /**
     * 사용자 메시지를 화면에 추가한다.
     */
    function appendUserMessage(message) {
        const messageElement = document.createElement("div");

        messageElement.className = "message user-message";

        messageElement.innerHTML = `
            <div class="message-profile">ME</div>

            <div class="message-content">
                <div class="message-name">You</div>
                <div class="message-bubble"></div>
            </div>
        `;

        messageElement
            .querySelector(".message-bubble")
            .textContent = message;

        chatHistory.appendChild(messageElement);

        scrollToBottom();
    }

    /**
     * 비어 있는 AI 메시지 영역을 만들고 말풍선을 반환한다.
     */
    function appendAiMessage() {
        const messageElement = document.createElement("div");

        messageElement.className = "message ai-message";

        messageElement.innerHTML = `
            <div class="message-profile">AI</div>

            <div class="message-content">
                <div class="message-name">LocalMate AI</div>
                <div class="message-bubble"></div>
            </div>
        `;

        chatHistory.appendChild(messageElement);

        scrollToBottom();

        const aiBubble =
            messageElement.querySelector(".message-bubble");

        aiBubble.dataset.markdown = "";

        return aiBubble;
    }

    /**
     * 응답 생성 중 입력 요소를 제어한다.
     */
    function setInputDisabled(disabled) {
        sendBtn.disabled = disabled;
        messageInput.disabled = disabled;
        regionSelect.disabled = disabled;
        languageSelect.disabled = disabled;

        sendBtn.textContent = disabled ? "응답 중" : "전송";
    }

    /**
     * 입력 내용에 따라 textarea 높이를 조절한다.
     */
    function resizeTextarea() {
        messageInput.style.height = "auto";

        messageInput.style.height =
            `${Math.min(messageInput.scrollHeight, 150)}px`;
    }

    /**
     * 채팅 내역의 가장 아래로 이동한다.
     */
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    /**
     * 화면에 현재 대화 식별자의 일부를 표시한다.
     */
    function updateConversationStatus() {
        const shortId = conversationId.substring(0, 8);

        conversationStatus.textContent = `대화 ID: ${shortId}`;
    }
});