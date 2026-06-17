package com.auric.tokenengine.controller;

import com.auric.tokenengine.domain.Transaction;
import com.auric.tokenengine.domain.TransactionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Transaction history for a wallet (mint/burn/transfer). */
@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionRepository repo;

    public TransactionController(TransactionRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<TxnView> list(@RequestParam String wallet) {
        return repo.findByWallet(wallet).stream().limit(50).map(TxnView::from).toList();
    }

    /** All recent transactions (admin view). */
    @GetMapping("/recent")
    public List<TxnView> recent() {
        return repo.findTop50ByOrderByIdDesc().stream().map(TxnView::from).toList();
    }

    public record TxnView(Long id, String type, String state, BigDecimal grams, BigDecimal fiatAmountSgd,
                          String counterparty, String txnHash, OffsetDateTime createdAt) {
        static TxnView from(Transaction t) {
            return new TxnView(t.id, t.type, t.state, t.goldGrams, t.fiatAmountSgd, t.counterparty, t.txnHash, t.createdAt);
        }
    }
}
