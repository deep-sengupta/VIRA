package com.example.vira;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.ChatViewHolder> {

    private ArrayList<ChatMessage> chatMessages;

    public ChatAdapter(ArrayList<ChatMessage> chatMessages) {
        this.chatMessages = chatMessages;
    }

    @NonNull
    @Override
    public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.chat_item, parent, false);
        return new ChatViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
        ChatMessage chatMessage = chatMessages.get(position);

        if (chatMessage.isOutgoing()) {
            holder.incomingMessage.setVisibility(View.GONE);
            holder.outgoingMessage.setVisibility(View.VISIBLE);
            holder.outgoingMessage.setText(chatMessage.getMessage());
        } else {
            holder.outgoingMessage.setVisibility(View.GONE);
            holder.incomingMessage.setVisibility(View.VISIBLE);
            holder.incomingMessage.setText(chatMessage.getMessage());
        }
    }

    @Override
    public int getItemCount() {
        return chatMessages.size();
    }

    public static class ChatViewHolder extends RecyclerView.ViewHolder {
        TextView incomingMessage;
        TextView outgoingMessage;

        public ChatViewHolder(@NonNull View itemView) {
            super(itemView);
            incomingMessage = itemView.findViewById(R.id.incomingMessage);
            outgoingMessage = itemView.findViewById(R.id.outgoingMessage);
        }
    }
}
