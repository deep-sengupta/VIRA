const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const voiceInputButton = document.querySelector("#voice-input-button");
const typingInput = document.querySelector(".typing-input");
const chatHistoryButton = document.querySelector("#chat-history-button");
const chatHistoryModal = document.querySelector("#chat-history-modal");
const closeHistoryButton = document.querySelector("#close-history-button");
const historyList = document.querySelector(".history-list");
const clearHistoryButton = document.querySelector("#clear-history-button");
const header = document.querySelector(".header");
const startChatMessage = document.querySelector("#start-chat-message");

let isListening = false;
let recognition;
let userMessage = null;
let isResponseGenerating = false;
let shouldAutoScroll = true;
let currentChatIndex = null;

const API_KEY = "API_KEY";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

const loadChatSessions = () => {
    return JSON.parse(localStorage.getItem('chat-sessions')) || [];
};

const showStartChatMessage = () => {
    startChatMessage.classList.add('show');
};

const hideStartChatMessage = () => {
    startChatMessage.classList.remove('show');
};

const checkChatSessions = () => {
    const chatSessions = loadChatSessions();
    if(chatSessions.length === 0){
        hideStartChatMessage();
    }else{
        showStartChatMessage();
    }
};

const showModal = (modal) => {
    modal.classList.remove('hide');
    modal.classList.add('show');
};

const hideModal = (modal) => {
    modal.classList.remove('show');
    modal.classList.add('hide');
};

chatHistoryButton.addEventListener("click", () => {
    displayChatSessions();
    showModal(chatHistoryModal);
});

closeHistoryButton.addEventListener("click", () => {
    hideModal(chatHistoryModal);
});

startChatMessage.addEventListener("click", () => {
    chatContainer.innerHTML = '';
    typingInput.value = '';
    localStorage.removeItem('current-chat');
    header.style.display = "block";
    currentChatIndex = null;
    displayChatSessions();
    hideStartChatMessage();
});

const saveChatSessions = (sessions) => {
    localStorage.setItem('chat-sessions', JSON.stringify(sessions));
};

const saveCurrentChat = () => {
    localStorage.setItem('current-chat', chatContainer.innerHTML);
};

const displayChatSessions = () => {
    const chatSessions = loadChatSessions();
    historyList.innerHTML = '';

    chatSessions.forEach((session, index) => {
        const sessionItem = document.createElement('div');
        sessionItem.classList.add('chat-session-item');

        const title = session.title || `Session ${index + 1}`;
        sessionItem.innerHTML = `
            ${title}
            <span class="material-symbols-rounded delete-session-icon" data-index="${index}">delete</span>
        `;
        sessionItem.querySelector(".delete-session-icon").addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChatSession(index);
        });
        sessionItem.addEventListener('click', () => loadChatSession(index));
        historyList.appendChild(sessionItem);
    });
};

const loadChatSession = (index) => {
    const chatSessions = loadChatSessions();
    if(chatSessions[index]){
        clearCurrentChat();
        chatContainer.innerHTML = chatSessions[index].content;
        currentChatIndex = index;
        saveCurrentChat();
        hideHeader();
        chatHistoryModal.classList.remove('show');
        showStartChatMessage();
    }
};

const deleteChatSession = (index) => {
    let chatSessions = loadChatSessions();
    chatSessions.splice(index, 1);
    saveChatSessions(chatSessions);
    displayChatSessions();

    clearCurrentChat();
    header.style.display = "block";
    hideStartChatMessage();
    hideModal(chatHistoryModal);
};

clearHistoryButton.addEventListener("click", () => {
    if(confirm("Are you sure you want to delete all chat history?")){
        localStorage.removeItem("chat-sessions");
        localStorage.removeItem("current-chat");

        chatContainer.innerHTML = '';
        typingInput.value = '';
        currentChatIndex = null;
        header.style.display = "block";
        displayChatSessions();
        hideStartChatMessage();
        hideModal(chatHistoryModal);
    }
});

const hideHeader = () => {
    header.style.display = "none";
};

const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const scrollToBottom = () => {
    if(shouldAutoScroll){
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
};

chatContainer.addEventListener("scroll", () => {
    const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop === chatContainer.clientHeight;
    shouldAutoScroll = isAtBottom;
});

const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;
    const typingInterval = setInterval(() => {
        if(currentWordIndex === 0){
            textElement.innerText = '';
        }
        textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");
        if(currentWordIndex === words.length){
            clearInterval(typingInterval);
            isResponseGenerating = false;

            const loadingDots = incomingMessageDiv.querySelector('.loading-dots');
            if(loadingDots) loadingDots.remove();
            localStorage.setItem("saved-chats", chatContainer.innerHTML);
            updateChatHistory();
        }
        scrollToBottom();
    }, 50);
};

const generateAPIResponse = async (incomingMessageDiv, regenerate = false) => {
    const textElement = incomingMessageDiv.querySelector(".text");

    if(!userMessage){
        textElement.innerText = 'No user message to regenerate from.';
        return;
    }
    try{
        if(regenerate) incomingMessageDiv.classList.add('loading');
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: userMessage }]
                }]
            }),
        });
        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        const apiResponse = data?.candidates[0]?.content?.parts[0]?.text.replace(/\*\*(.*?)\*\*/g, '$1');
        if(apiResponse){
            showTypingEffect(apiResponse, textElement, incomingMessageDiv);
        }else{
            throw new Error('API returned no response.');
        }
    }catch(error){
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.parentElement.closest(".message").classList.add("error");
    }finally{
        incomingMessageDiv.classList.remove("loading");
    }
};

const extractLastUserMessage = () => {
    const outgoingMessages = chatContainer.querySelectorAll(".outgoing-card .text");
    if(outgoingMessages.length > 0){
        userMessage = outgoingMessages[outgoingMessages.length - 1].innerText;
    }else{
        userMessage = null;
    }
};

const showLoadingAnimation = () => {
    const html = `<div class="message-content loading-card">
                    <p class="text">Generating response...</p>
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <div class="action-icons left">
                    <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
                    <span onClick="regenerateResponse(this)" class="icon material-symbols-rounded">refresh</span>
                </div>`;
    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);
    scrollToBottom();
    generateAPIResponse(incomingMessageDiv);
};

const clearCurrentChat = () => {
    chatContainer.innerHTML = '';
    typingInput.value = '';
    userMessage = null;
    localStorage.removeItem('current-chat');
    currentChatIndex = null;
    isResponseGenerating = false;
};

const saveNewChatSession = (generatedTitle) => {
    const currentChat = chatContainer.innerHTML.trim();
    const chatSessions = loadChatSessions();

    if(currentChat){
        chatSessions.push({ content: currentChat, title: generatedTitle });
        currentChatIndex = chatSessions.length - 1;
    }
    saveChatSessions(chatSessions);
    displayChatSessions();
};

const regenerateResponse = (reloadButton) => {
    extractLastUserMessage();
    if(!userMessage) return;

    const messageDiv = reloadButton.closest('.message');
    messageDiv.querySelector('.text').innerText = '';
    generateAPIResponse(messageDiv, true);
};

const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.closest('.message').querySelector(".text").innerText;
    navigator.clipboard.writeText(messageText);
    copyButton.innerText = "done";
    setTimeout(() => copyButton.innerText = "content_copy", 1000);
};

const generateChatTitle = async (userPrompt) => {
    try{
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: `Generate a short, descriptive title for the following chat: ${userPrompt}` }]
                }]
            }),
        });
        const data = await response.json();
        if(response.ok){
            return data?.candidates[0]?.content?.parts[0]?.text || "Untitled Session";
        }else{
            throw new Error(data.error.message);
        }
    }catch (error){
        console.error("Error generating title:", error);
        return "Untitled Session";
    }
};

const handleOutgoingChat = async () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if(!userMessage || isResponseGenerating) return;

    isResponseGenerating = true;
    const html = `<div class="message-content outgoing-card">
                    <p class="text">${userMessage}</p>
                </div>`;
    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    chatContainer.appendChild(outgoingMessageDiv);
    typingForm.reset();
    hideHeader();
    scrollToBottom();
    saveCurrentChat();
    showStartChatMessage();

    if(currentChatIndex === null){
        const chatTitle = await generateChatTitle(userMessage);
        saveNewChatSession(chatTitle);
    }
    showLoadingAnimation();
    saveCurrentChat();
    isResponseGenerating = false;
};

const updateChatHistory = () => {
    const currentChat = chatContainer.innerHTML.trim();
    const chatSessions = loadChatSessions();

    if(currentChatIndex !== null && currentChatIndex >= 0){
        chatSessions[currentChatIndex].content = currentChat;
    }
    saveChatSessions(chatSessions);
    displayChatSessions();
};

voiceInputButton.addEventListener("click", () => {
    if(!recognition){
        recognition = new(window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        typingInput.value += speechToText;
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };
}
    if(isListening){
        recognition.stop();
        isListening = false;
        voiceInputButton.innerText = "mic";
    }else{
        recognition.start();
        isListening = true;
        voiceInputButton.innerText = "mic_off";
    }
});

chatHistoryButton.addEventListener("click", () => {
    displayChatSessions();
    chatHistoryModal.classList.add('show');
});

closeHistoryButton.addEventListener("click", () => {
    chatHistoryModal.classList.remove('show');
});

typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideModal(chatHistoryModal);
    handleOutgoingChat();
});

window.onload = () => {
    const savedChat = localStorage.getItem("current-chat");
    if(savedChat){
        chatContainer.innerHTML = savedChat;
        scrollToBottom();
        if(chatContainer.innerHTML.trim()){
            hideHeader();
            showStartChatMessage();
        }
    }else{
        hideStartChatMessage();
    }
};