package com.auric.tokenengine.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marks a method whose successful invocation writes an immutable audit row. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {
    /** Action label, e.g. MINT, BURN, WHITELIST, RECON. */
    String action();
}
