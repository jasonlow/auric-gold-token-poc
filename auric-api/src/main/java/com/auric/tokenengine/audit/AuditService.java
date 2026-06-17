package com.auric.tokenengine.audit;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Writes immutable audit rows. REQUIRES_NEW so the record persists independently. */
@Service
public class AuditService {

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recent(int limit) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, actor, action, target, details::text, created_at FROM audit_log ORDER BY id DESC LIMIT :n")
            .setParameter("n", limit).getResultList();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r[0]);
            m.put("actor", r[1]);
            m.put("action", r[2]);
            m.put("target", r[3]);
            m.put("details", r[4]);
            m.put("createdAt", r[5] == null ? null : r[5].toString());
            out.add(m);
        }
        return out;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String actor, String action, String target, String detailsJson) {
        em.createNativeQuery(
                "INSERT INTO audit_log (actor, action, target, details) VALUES (:actor, :action, :target, CAST(:details AS jsonb))")
            .setParameter("actor", actor == null ? "system" : actor)
            .setParameter("action", action)
            .setParameter("target", target == null ? "" : target)
            .setParameter("details", detailsJson == null ? "{}" : detailsJson)
            .executeUpdate();
    }
}
