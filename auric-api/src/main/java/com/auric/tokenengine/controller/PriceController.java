package com.auric.tokenengine.controller;

import com.auric.tokenengine.pricing.PricingService;
import com.auric.tokenengine.pricing.PricingService.Quote;
import com.auric.tokenengine.pricing.PricingService.Side;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/price")
public class PriceController {

    private final PricingService pricing;

    public PriceController(PricingService pricing) {
        this.pricing = pricing;
    }

    @GetMapping("/quote")
    public Quote quote(@RequestParam BigDecimal grams,
                       @RequestParam(defaultValue = "MINT") Side side) {
        return pricing.quote(grams, side);
    }

    @GetMapping("/spot")
    public PricingService.Spot spot() {
        return pricing.spot();
    }
}
