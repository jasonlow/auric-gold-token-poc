package com.auric.tokenengine.auth;

import org.springframework.stereotype.Service;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.nio.charset.StandardCharsets;
import java.security.SignatureException;
import java.util.Arrays;

/**
 * Sign-In With Ethereum (EIP-4361-style). Verifies a personal_sign (EIP-191)
 * signature over the sign-in message and extracts the claimed address + nonce.
 */
@Service
public class SiweService {

    /** Recover the signer address from an EIP-191 personal_sign signature (0x… hex). */
    public String recover(String message, String signatureHex) {
        byte[] sig = Numeric.hexStringToByteArray(signatureHex);
        if (sig.length != 65) throw new IllegalArgumentException("signature must be 65 bytes");
        byte v = sig[64];
        if (v < 27) v += 27; // some wallets return 0/1
        Sign.SignatureData data = new Sign.SignatureData(
            v, Arrays.copyOfRange(sig, 0, 32), Arrays.copyOfRange(sig, 32, 64));
        try {
            var pubKey = Sign.signedPrefixedMessageToKey(message.getBytes(StandardCharsets.UTF_8), data);
            return "0x" + Keys.getAddress(pubKey);
        } catch (SignatureException e) {
            throw new IllegalArgumentException("could not recover signer", e);
        }
    }

    /** The address line of an EIP-4361 message (line 2). */
    public String address(String message) {
        String[] lines = message.split("\n");
        return lines.length > 1 ? lines[1].trim() : null;
    }

    /** The "Nonce: …" value of an EIP-4361 message. */
    public String nonce(String message) {
        for (String line : message.split("\n")) {
            String t = line.trim();
            if (t.startsWith("Nonce:")) return t.substring("Nonce:".length()).trim();
        }
        return null;
    }
}
