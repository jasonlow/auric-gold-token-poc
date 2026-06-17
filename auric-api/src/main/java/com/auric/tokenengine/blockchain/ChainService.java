package com.auric.tokenengine.blockchain;

import com.auric.tokenengine.config.BlockchainProperties;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Int256;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.abi.datatypes.generated.Uint80;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;

/**
 * Read-only on-chain access for the GoldToken (XAU.g). Uses Web3j eth_call.
 * Sending mint/burn (saga + signer) is added in ENGINE-05.
 */
@Service
public class ChainService {

    private final Web3j web3j;
    private final BlockchainProperties props;

    public ChainService(Web3j web3j, BlockchainProperties props) {
        this.web3j = web3j;
        this.props = props;
    }

    /** Network chain id reported by the RPC (confirms config matches the chain). */
    public BigInteger chainId() {
        try {
            return web3j.ethChainId().send().getChainId();
        } catch (IOException e) {
            throw new ChainException("eth_chainId failed", e);
        }
    }

    public int decimals() {
        Function fn = new Function("decimals", List.of(), List.of(new TypeReference<Uint8>() {}));
        return ((BigInteger) callSingle(props.contracts().goldToken(), fn)).intValue();
    }

    public BigInteger totalSupply() {
        Function fn = new Function("totalSupply", List.of(), List.of(new TypeReference<Uint256>() {}));
        return (BigInteger) callSingle(props.contracts().goldToken(), fn);
    }

    public BigInteger balanceOf(String wallet) {
        Function fn = new Function("balanceOf", List.of(new Address(wallet)), List.of(new TypeReference<Uint256>() {}));
        return (BigInteger) callSingle(props.contracts().goldToken(), fn);
    }

    /** Convert a raw token amount (decimals) to grams (1 token = 1 gram). */
    public BigDecimal toGrams(BigInteger raw, int decimals) {
        return new BigDecimal(raw).movePointLeft(decimals);
    }

    // --- Price feed (Chainlink-compatible MockV3Aggregator: XAU/USD per ounce) ---

    public int priceFeedDecimals() {
        Function fn = new Function("decimals", List.of(), List.of(new TypeReference<Uint8>() {}));
        return ((BigInteger) callSingle(props.contracts().priceFeed(), fn)).intValue();
    }

    /** @return [answer, updatedAt] from latestRoundData. */
    public BigInteger[] priceFeedLatest() {
        Function fn = new Function(
            "latestRoundData",
            List.of(),
            List.of(
                new TypeReference<Uint80>() {}, new TypeReference<Int256>() {}, new TypeReference<Uint256>() {},
                new TypeReference<Uint256>() {}, new TypeReference<Uint80>() {}
            )
        );
        List<Type> out = call(props.contracts().priceFeed(), fn);
        return new BigInteger[] {(BigInteger) out.get(1).getValue(), (BigInteger) out.get(3).getValue()};
    }

    private Object callSingle(String to, Function fn) {
        List<Type> out = call(to, fn);
        if (out.isEmpty()) {
            throw new ChainException("empty return for " + fn.getName(), null);
        }
        return out.get(0).getValue();
    }

    private List<Type> call(String to, Function fn) {
        if (to == null || to.isBlank()) {
            throw new ChainException("contract address not configured for " + fn.getName(), null);
        }
        try {
            String data = FunctionEncoder.encode(fn);
            EthCall resp = web3j
                .ethCall(Transaction.createEthCallTransaction(null, to, data), DefaultBlockParameterName.LATEST)
                .send();
            if (resp.isReverted()) {
                throw new ChainException("call reverted: " + resp.getRevertReason(), null);
            }
            return FunctionReturnDecoder.decode(resp.getValue(), fn.getOutputParameters());
        } catch (IOException e) {
            throw new ChainException("eth_call failed for " + fn.getName() + ": " + e.getMessage(), e);
        }
    }
}
