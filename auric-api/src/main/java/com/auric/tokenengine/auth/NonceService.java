package com.auric.tokenengine.auth;

import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Issues single-use, short-lived nonces for SIWE (sign-in-with-Ethereum).
 * A nonce binds one sign-in attempt to one address so a signature can't be
 * replayed. In-memory is fine for the POC (single engine instance).
 */
@Service
public class NonceService {

    private record Entry(String nonce, long expiresAt) {}

    private static final long TTL_MS = 5 * 60 * 1000; // 5 minutes
    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final SecureRandom rng = new SecureRandom();

    public String issue(String address) {
        String nonce = new BigInteger(130, rng).toString(32);
        store.put(address.toLowerCase(), new Entry(nonce, System.currentTimeMillis() + TTL_MS));
        return nonce;
    }

    /** Validate AND consume (single-use): true only if it matches and is unexpired. */
    public boolean consume(String address, String nonce) {
        Entry e = store.remove(address.toLowerCase());
        return e != null && e.nonce.equals(nonce) && System.currentTimeMillis() < e.expiresAt;
    }
}
