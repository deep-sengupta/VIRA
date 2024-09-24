package com.example.vira;

public class ChatMessage {

    private String sender;
    private String message;
    private boolean isOutgoing;

    public ChatMessage(String sender, String message, boolean isOutgoing) {
        this.sender = sender;
        this.message = message;
        this.isOutgoing = isOutgoing;
    }

    public String getSender() {
        return sender;
    }

    public String getMessage() {
        return message;
    }

    public boolean isOutgoing() {
        return isOutgoing;
    }
}
