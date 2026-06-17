package com.auric.tokenengine.blockchain;

import com.auric.tokenengine.config.BlockchainProperties;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint16;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthEstimateGas;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;

import java.io.IOException;
import java.math.BigInteger;
import java.util.List;

/**
 * Signs and sends state-changing transactions with the engine's MINTER key
 * (the TrustedIssuer). Used by the mint/burn sagas and for whitelisting.
 * IMPORTANT: callers invoke these OUTSIDE any DB transaction (SAD C1).
 */
@Service
public class TokenWriteService {

    private final Web3j web3j;
    private final BlockchainProperties props;
    private final Credentials minter; // null if no key configured

    public TokenWriteService(Web3j web3j, BlockchainProperties props) {
        this.web3j = web3j;
        this.props = props;
        String pk = props.minterPrivateKey();
        this.minter = (pk != null && !pk.isBlank()) ? Credentials.create(pk) : null;
    }

    public String minterAddress() {
        return minter != null ? minter.getAddress() : null;
    }

    /** mint(to, amount) — only the TrustedIssuer may call this on-chain. */
    public String sendMint(String to, BigInteger amount) {
        Function fn = new Function("mint", List.of(new Address(to), new Uint256(amount)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** burn(from, amount) — only the TrustedIssuer. */
    public String sendBurn(String from, BigInteger amount) {
        Function fn = new Function("burn", List.of(new Address(from), new Uint256(amount)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** setAddressFrozen(wallet, frozen) — admin freeze/unfreeze (agent). */
    public String setAddressFrozen(String wallet, boolean frozen) {
        Function fn = new Function("setAddressFrozen", List.of(new Address(wallet), new Bool(frozen)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** forcedTransfer(from, to, amount) — recovery / regulatory (agent). */
    public String forcedTransfer(String from, String to, BigInteger amount) {
        Function fn = new Function("forcedTransfer",
            List.of(new Address(from), new Address(to), new Uint256(amount)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** freezePartialTokens(wallet, amount) — escrow lock (agent). */
    public String freezePartial(String wallet, BigInteger amount) {
        Function fn = new Function("freezePartialTokens", List.of(new Address(wallet), new Uint256(amount)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** unfreezePartialTokens(wallet, amount) — release escrow (agent). */
    public String unfreezePartial(String wallet, BigInteger amount) {
        Function fn = new Function("unfreezePartialTokens", List.of(new Address(wallet), new Uint256(amount)), List.of());
        return send(props.contracts().goldToken(), FunctionEncoder.encode(fn));
    }

    /** registerIdentity(wallet, kycHash, country, accredited, expiry) on the registry. */
    public String registerIdentity(String wallet, int country, boolean accredited, long expiry) {
        byte[] kycHash = Hash.sha3(wallet.toLowerCase().getBytes());
        Function fn = new Function(
            "registerIdentity",
            List.of(new Address(wallet), new Bytes32(kycHash), new Uint16(BigInteger.valueOf(country)),
                new Bool(accredited), new Uint64(BigInteger.valueOf(expiry))),
            List.of()
        );
        return send(props.contracts().identityRegistry(), FunctionEncoder.encode(fn));
    }

    private String send(String contract, String data) {
        if (minter == null) throw new ChainException("minter private key not configured", null);
        try {
            RawTransactionManager tm = new RawTransactionManager(web3j, minter, props.chainId());
            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
            BigInteger gasLimit = estimateGas(contract, data);
            EthSendTransaction resp = tm.sendTransaction(gasPrice, gasLimit, contract, data, BigInteger.ZERO);
            if (resp.hasError()) {
                throw new ChainException("send failed: " + resp.getError().getMessage(), null);
            }
            return resp.getTransactionHash();
        } catch (IOException e) {
            throw new ChainException("send failed: " + e.getMessage(), e);
        }
    }

    /** Estimate gas for the call (+25% buffer); avoids over-reserving balance. */
    private BigInteger estimateGas(String contract, String data) {
        try {
            org.web3j.protocol.core.methods.request.Transaction call =
                org.web3j.protocol.core.methods.request.Transaction.createFunctionCallTransaction(
                    minter.getAddress(), null, null, null, contract, BigInteger.ZERO, data);
            EthEstimateGas est = web3j.ethEstimateGas(call).send();
            if (est.hasError()) return BigInteger.valueOf(300_000);
            return est.getAmountUsed().multiply(BigInteger.valueOf(125)).divide(BigInteger.valueOf(100));
        } catch (IOException e) {
            return BigInteger.valueOf(300_000);
        }
    }

    /** Polls for the receipt; returns null on timeout. */
    public TransactionReceipt waitForReceipt(String txHash) {
        for (int i = 0; i < 60; i++) {
            try {
                var r = web3j.ethGetTransactionReceipt(txHash).send().getTransactionReceipt();
                if (r.isPresent()) return r.get();
            } catch (IOException e) {
                throw new ChainException("receipt poll failed: " + e.getMessage(), e);
            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return null;
    }
}
