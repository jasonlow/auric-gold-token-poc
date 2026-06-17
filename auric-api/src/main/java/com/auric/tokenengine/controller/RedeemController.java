package com.auric.tokenengine.controller;

import com.auric.tokenengine.redeem.BurnService;
import com.auric.tokenengine.redeem.RedeemDtos.RedeemRequest;
import com.auric.tokenengine.redeem.RedeemDtos.RedeemResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RedeemController {

    private final BurnService burnService;

    public RedeemController(BurnService burnService) {
        this.burnService = burnService;
    }

    @PostMapping("/redeem")
    public RedeemResult redeem(@Valid @RequestBody RedeemRequest request) {
        return burnService.redeem(request);
    }
}
