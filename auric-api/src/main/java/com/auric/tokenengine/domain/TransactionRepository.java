package com.auric.tokenengine.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    @Query("select t from Transaction t where lower(t.counterparty) = lower(:wallet) order by t.id desc")
    List<Transaction> findByWallet(@Param("wallet") String wallet);

    List<Transaction> findTop50ByOrderByIdDesc();
}
