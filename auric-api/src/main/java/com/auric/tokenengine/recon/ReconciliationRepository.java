package com.auric.tokenengine.recon;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReconciliationRepository extends JpaRepository<Reconciliation, Long> {
    Optional<Reconciliation> findTopByOrderByIdDesc();
}
