package com.auric.tokenengine.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Writes an audit row after any {@link Audited} method returns successfully. */
@Aspect
@Component
public class AuditAspect {

    private static final Pattern ADDRESS = Pattern.compile("0x[0-9a-fA-F]{40}");

    private final AuditService audit;
    private final ObjectMapper mapper;

    public AuditAspect(AuditService audit, ObjectMapper mapper) {
        this.audit = audit;
        this.mapper = mapper;
    }

    @AfterReturning(value = "@annotation(audited)", returning = "result")
    public void onAudited(JoinPoint jp, Audited audited, Object result) {
        String details;
        try {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("method", jp.getSignature().getName());
            d.put("args", Arrays.stream(jp.getArgs()).map(String::valueOf).toList());
            d.put("result", String.valueOf(result));
            details = mapper.writeValueAsString(d);
        } catch (Exception e) {
            details = "{\"error\":\"audit-serialize\"}";
        }
        Matcher m = ADDRESS.matcher(details);
        String target = m.find() ? m.group() : "";
        audit.record("system", audited.action(), target, details);
    }
}
