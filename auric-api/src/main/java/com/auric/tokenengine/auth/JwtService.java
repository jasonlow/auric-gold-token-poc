package com.auric.tokenengine.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Minimal, dependency-free HS256 JWT (header.payload.signature). Good enough for
 * the POC session token; production would use a vetted JWT library + key rotation.
 */
@Service
public class JwtService {

    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();
    private static final String HEADER_B64 = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final byte[] secret;
    private final long ttlSeconds;
    private final ObjectMapper om = new ObjectMapper();

    public JwtService(
            @Value("${auric.auth.jwt-secret:dev-only-insecure-change-me-please-32chars}") String secret,
            @Value("${auric.auth.ttl-seconds:86400}") long ttlSeconds) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlSeconds;
    }

    public String issue(String subject) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", subject);
        claims.put("iat", now);
        claims.put("exp", now + ttlSeconds);
        String payload;
        try {
            payload = base64Url(om.writeValueAsBytes(claims));
        } catch (Exception e) {
            throw new IllegalStateException("jwt encode failed", e);
        }
        String signingInput = HEADER_B64 + "." + payload;
        return signingInput + "." + base64Url(hmac(signingInput));
    }

    /** Returns the subject (lowercase address) if the token is valid and unexpired, else null. */
    public String verify(String token) {
        if (token == null) return null;
        String[] parts = token.split("\\.");
        if (parts.length != 3) return null;
        String signingInput = parts[0] + "." + parts[1];
        String expected = base64Url(hmac(signingInput));
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
            return null;
        }
        try {
            JsonNode node = om.readTree(DEC.decode(parts[1]));
            if (Instant.now().getEpochSecond() > node.path("exp").asLong()) return null;
            return node.path("sub").asText(null);
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("hmac failed", e);
        }
    }

    private static String base64Url(byte[] b) {
        return ENC.encodeToString(b);
    }
}
