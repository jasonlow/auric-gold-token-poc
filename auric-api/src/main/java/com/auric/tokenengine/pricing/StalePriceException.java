package com.auric.tokenengine.pricing;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Price/quote is stale or expired — the caller must re-quote (F9). */
@ResponseStatus(HttpStatus.CONFLICT)
public class StalePriceException extends RuntimeException {
    public StalePriceException(String message) {
        super(message);
    }
}
