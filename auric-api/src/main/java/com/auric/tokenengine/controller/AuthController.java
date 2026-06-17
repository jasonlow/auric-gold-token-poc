package com.auric.tokenengine.controller;

import com.auric.tokenengine.auth.JwtService;
import com.auric.tokenengine.auth.NonceService;
import com.auric.tokenengine.auth.SiweService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * SIWE sign-in (WALLET-03): nonce → wallet-signed message → JWT session.
 *   GET  /auth/nonce?address=0x…   → { nonce }
 *   POST /auth/verify { message, signature } → { token, address }
 *   GET  /auth/me  (Bearer token)  → { address }
 *
 * Mint/burn stay engine-signed and are NOT gated by this token; SIWE proves
 * wallet ownership for portal sessions. Gating investor/admin actions on the
 * JWT is a Phase-2 follow-up.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final NonceService nonces;
    private final SiweService siwe;
    private final JwtService jwt;

    public AuthController(NonceService nonces, SiweService siwe, JwtService jwt) {
        this.nonces = nonces;
        this.siwe = siwe;
        this.jwt = jwt;
    }

    @GetMapping("/nonce")
    public Map<String, String> nonce(@RequestParam String address) {
        return Map.of("nonce", nonces.issue(address));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body) {
        String message = body.get("message");
        String signature = body.get("signature");
        if (message == null || signature == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "message and signature are required"));
        }
        String claimed = siwe.address(message);
        String nonce = siwe.nonce(message);
        String recovered;
        try {
            recovered = siwe.recover(message, signature);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid signature"));
        }
        if (claimed == null || !recovered.equalsIgnoreCase(claimed)) {
            return ResponseEntity.status(401).body(Map.of("error", "signature does not match address"));
        }
        if (nonce == null || !nonces.consume(claimed, nonce)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid or expired nonce"));
        }
        String token = jwt.issue(recovered.toLowerCase());
        return ResponseEntity.ok(Map.of("token", token, "address", recovered));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        String token = (authorization != null && authorization.startsWith("Bearer "))
            ? authorization.substring(7) : null;
        String subject = jwt.verify(token);
        if (subject == null) {
            return ResponseEntity.status(401).body(Map.of("error", "not authenticated"));
        }
        return ResponseEntity.ok(Map.of("address", subject));
    }
}
