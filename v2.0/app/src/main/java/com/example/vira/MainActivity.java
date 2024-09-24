package com.example.vira;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Intent;
import android.graphics.LinearGradient;
import android.graphics.Shader;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import com.google.gson.Gson;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MainActivity extends AppCompatActivity {

    private static final String API_KEY = "YOUR_GEMINI_API_KEY";
    private static final String API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=" + API_KEY;
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final int VOICE_REQUEST_CODE = 100;

    private RecyclerView chatListRecycler;
    private EditText typingInput;
    private ImageView sendMessageButton, voiceInputButton, deleteButton;
    private TextView titleText, subtitleText;
    private ChatAdapter chatAdapter;
    private ArrayList<ChatMessage> chatMessages;
    private OkHttpClient client;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        chatListRecycler = findViewById(R.id.chatListRecycler);
        typingInput = findViewById(R.id.typingInput);
        sendMessageButton = findViewById(R.id.sendMessageButton);
        voiceInputButton = findViewById(R.id.voiceInputButton);
        deleteButton = findViewById(R.id.deleteButton);
        titleText = findViewById(R.id.titleText);
        subtitleText = findViewById(R.id.subtitleText);

        chatMessages = new ArrayList<>();
        chatAdapter = new ChatAdapter(chatMessages);
        chatListRecycler.setLayoutManager(new LinearLayoutManager(this));
        chatListRecycler.setAdapter(chatAdapter);

        client = new OkHttpClient.Builder().build();

        applyGradientToText();
        startTextAnimation();

        sendMessageButton.setOnClickListener(v -> {
            String userMessage = typingInput.getText().toString().trim();
            if (!userMessage.isEmpty()) {
                chatMessages.add(new ChatMessage("You", userMessage, true));
                chatAdapter.notifyDataSetChanged();
                typingInput.setText("");
                scrollToBottom();
                sendMessageToAPI(userMessage);
                hideHeaders();
            }
        });

        voiceInputButton.setOnClickListener(v -> startVoiceInput());

        deleteButton.setOnClickListener(v -> {
            chatMessages.clear();
            chatAdapter.notifyDataSetChanged();
            Toast.makeText(MainActivity.this, "Chat cleared", Toast.LENGTH_SHORT).show();
            showHeaders();
        });
    }

    private void sendMessageToAPI(String userMessage) {
        try {
            HashMap<String, Object> requestData = new HashMap<>();
            ArrayList<HashMap<String, String>> partsList = new ArrayList<>();
            HashMap<String, String> messagePart = new HashMap<>();
            messagePart.put("text", userMessage);
            partsList.add(messagePart);

            HashMap<String, Object> roleMap = new HashMap<>();
            roleMap.put("role", "user");
            roleMap.put("parts", partsList);
            ArrayList<HashMap<String, Object>> contents = new ArrayList<>();
            contents.add(roleMap);

            requestData.put("contents", contents);

            String jsonString = new Gson().toJson(requestData);
            RequestBody body = RequestBody.create(jsonString, JSON);

            Request request = new Request.Builder()
                    .url(API_URL)
                    .post(body)
                    .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Failed to get response", Toast.LENGTH_SHORT).show());
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (!response.isSuccessful()) {
                        runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error from API", Toast.LENGTH_SHORT).show());
                    } else {
                        String responseData = response.body().string();
                        runOnUiThread(() -> handleAPIResponse(responseData));
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleAPIResponse(String responseData) {
        try {
            GeminiResponse geminiResponse = new Gson().fromJson(responseData, GeminiResponse.class);
            String responseText = geminiResponse.getCandidates().get(0).getContent().getParts().get(0).getText();
            chatMessages.add(new ChatMessage("VIRA", responseText, false));
            chatAdapter.notifyDataSetChanged();
            scrollToBottom();
        } catch (Exception e) {
            Toast.makeText(this, "Failed to parse response", Toast.LENGTH_SHORT).show();
        }
    }

    private void scrollToBottom() {
        chatListRecycler.post(() -> chatListRecycler.smoothScrollToPosition(chatMessages.size() - 1));
    }

    private void startVoiceInput() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now...");
        try {
            startActivityForResult(intent, VOICE_REQUEST_CODE);
        } catch (Exception e) {
            Toast.makeText(this, "Voice input is not supported", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == VOICE_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> result = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            typingInput.setText(result.get(0));
        }
    }

    private void hideHeaders() {
        titleText.setVisibility(View.GONE);
        subtitleText.setVisibility(View.GONE);
    }

    private void showHeaders() {
        titleText.setVisibility(View.VISIBLE);
        subtitleText.setVisibility(View.VISIBLE);
    }

    private void applyGradientToText() {
        Shader textShader = new LinearGradient(0, 0, titleText.getPaint().measureText(titleText.getText().toString()), 0,
                new int[]{
                        getResources().getColor(R.color.gradient_start),
                        getResources().getColor(R.color.gradient_mid),
                        getResources().getColor(R.color.gradient_end)
                },
                new float[]{0f, 0.5f, 1f}, Shader.TileMode.CLAMP);
        titleText.getPaint().setShader(textShader);
        titleText.invalidate();
    }

    private void startTextAnimation() {
        ObjectAnimator scaleXAnimator = ObjectAnimator.ofFloat(titleText, "scaleX", 1.0f, 1.15f);
        ObjectAnimator scaleYAnimator = ObjectAnimator.ofFloat(titleText, "scaleY", 1.0f, 1.15f);

        scaleXAnimator.setDuration(1000);
        scaleYAnimator.setDuration(1000);

        scaleXAnimator.setRepeatMode(ValueAnimator.REVERSE);
        scaleYAnimator.setRepeatMode(ValueAnimator.REVERSE);

        scaleXAnimator.setRepeatCount(ValueAnimator.INFINITE);
        scaleYAnimator.setRepeatCount(ValueAnimator.INFINITE);

        scaleXAnimator.start();
        scaleYAnimator.start();
    }
}
