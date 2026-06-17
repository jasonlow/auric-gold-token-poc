package com.auric.tokenengine.blockchain;

/** Wraps low-level Web3j / RPC failures. */
public class ChainException extends RuntimeException {
    public ChainException(String message, Throwable cause) {
        super(message, cause);
    }
}
