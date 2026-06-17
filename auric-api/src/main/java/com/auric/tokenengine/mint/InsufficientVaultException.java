package com.auric.tokenengine.mint;

/** Thrown when reserved vault headroom is insufficient to back a mint. */
public class InsufficientVaultException extends RuntimeException {
    public InsufficientVaultException(String message) {
        super(message);
    }
}
