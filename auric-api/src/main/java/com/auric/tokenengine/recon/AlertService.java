package com.auric.tokenengine.recon;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Alert sink for breach / dependency-down / payout failures (ENGINE-11).
 * Always logs to console; also POSTs to a webhook if configured
 * (auric.alerts.webhook-url — e.g. a Telegram relay or the simulator).
 */
@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger("AURIC-ALERT");

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

    @Value("${auric.alerts.webhook-url:}")
    private String webhookUrl;

    public void alert(String message) {
        log.error("🚨 ALERT: {}", message);
        if (webhookUrl == null || webhookUrl.isBlank()) return;
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(webhookUrl))
                .timeout(Duration.ofSeconds(2))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"text\":" + jsonString(message) + "}"))
                .build();
            http.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            log.warn("alert webhook failed: {}", e.getMessage());
        }
    }

    private String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }
}
