package com.auric.tokenengine.controller;

import com.auric.tokenengine.mint.MintDtos.MintRequest;
import com.auric.tokenengine.mint.MintDtos.MintResult;
import com.auric.tokenengine.mint.MintService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal mint endpoint. NOTE: minting is exclusive to the Token Engine
 * (BRS FR-MINT-07) — this is an engine/admin surface, never an investor role.
 */
@RestController
@RequestMapping("/api/v1")
public class MintController {

    private final MintService mintService;

    public MintController(MintService mintService) {
        this.mintService = mintService;
    }

    @PostMapping("/mint")
    public MintResult mint(@Valid @RequestBody MintRequest request) {
        return mintService.mint(request);
    }
}
