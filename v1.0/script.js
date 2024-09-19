const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const deleteChatButton = document.querySelector("#delete-chat-button");
const voiceInputButton = document.querySelector("#voice-input-button");
const typingInput = document.querySelector(".typing-input");

let isListening = false;
let recognition;
let userMessage = null;
let isResponseGenerating = false;
let shouldAutoScroll = true;

const API_KEY = "API_KEY";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

const loadDataFromLocalstorage = () => {
    const savedChats = localStorage.getItem("saved-chats");
    chatContainer.innerHTML = savedChats || '';
    document.body.classList.toggle("hide-header", savedChats);
    scrollToBottom();
}

const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const scrollToBottom = () => {
    if(shouldAutoScroll){
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
}

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
        }
        scrollToBottom();
    }, 50);
}

const generateAPIResponse = async (incomingMessageDiv, regenerate = false) => {
    const textElement = incomingMessageDiv.querySelector(".text");
    try{
        if(regenerate) incomingMessageDiv.classList.add('loading');
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: userMessage }] }] }),
        });
        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);
        const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
    } catch(error){
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.parentElement.closest(".message").classList.add("error");
    } finally{
    incomingMessageDiv.classList.remove("loading");
    }
}

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
}

const regenerateResponse = (reloadButton) => {
    const messageDiv = reloadButton.closest('.message');
    messageDiv.querySelector('.text').innerText = '';
    generateAPIResponse(messageDiv, true);
}

const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.closest('.message').querySelector(".text").innerText;
    navigator.clipboard.writeText(messageText);
    copyButton.innerText = "done";
    setTimeout(() => copyButton.innerText = "content_copy", 1000);
}

const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if(!userMessage || isResponseGenerating) return;
    isResponseGenerating = true;
    const html = `<div class="message-content outgoing-card">
                    <p class="text">${userMessage}</p>
                </div>`;
    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    chatContainer.appendChild(outgoingMessageDiv);
    typingForm.reset();
    document.body.classList.add("hide-header");
    scrollToBottom();
    setTimeout(showLoadingAnimation, 500);
}

voiceInputButton.addEventListener("click", () => {
    if(!recognition) {
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
    } else{
        recognition.start();
        isListening = true;
        voiceInputButton.innerText = "mic_off";
    }
});

deleteChatButton.addEventListener("click", () => {
    if(confirm("Are you sure you want to delete all the chats?")){
        localStorage.removeItem("saved-chats");
        loadDataFromLocalstorage();
    }
});

typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

loadDataFromLocalstorage();