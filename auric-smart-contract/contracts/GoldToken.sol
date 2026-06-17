// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AgentRole} from "./roles/AgentRole.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";
import {ICompliance} from "./interfaces/ICompliance.sol";
import {ITrustedIssuers} from "./interfaces/ITrustedIssuers.sol";

/// @title GoldToken (XAU.g)
/// @notice ERC-3643-style permissioned gold token. 1 token = 1 gram of .9999
///         gold; 18 decimals (BRS FR-MINT-12). Every transfer is gated by the
///         IdentityRegistry (whitelist) and ComplianceModule (jurisdiction /
///         accreditation). Mint/burn are exclusive to the TrustedIssuers
///         (the Auric Token Engine). Supports freeze and forced transfer for
///         regulatory action and lost-wallet recovery.
contract GoldToken is ERC20, Pausable, ReentrancyGuard, AgentRole {
    IIdentityRegistry public identityRegistry;
    ICompliance public compliance;
    ITrustedIssuers public immutable trustedIssuers;

    mapping(address => bool) public frozen; // fully frozen wallets
    mapping(address => uint256) public frozenTokens; // partially frozen balance
    bool private _forcing; // true only inside forcedTransfer (bypasses freeze/pause)

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event AddressFrozen(address indexed user, bool frozen);
    event TokensFrozen(address indexed user, uint256 amount);
    event TokensUnfrozen(address indexed user, uint256 amount);
    event ForcedTransferExecuted(address indexed from, address indexed to, uint256 amount);
    event IdentityRegistrySet(address indexed registry);
    event ComplianceSet(address indexed compliance);

    modifier onlyTrustedIssuer() {
        require(trustedIssuers.isTrustedIssuer(msg.sender), "GoldToken: caller not a trusted issuer");
        _;
    }

    constructor(
        address owner_,
        address identityRegistry_,
        address compliance_,
        address trustedIssuers_
    ) ERC20("Auric Gold Token", "XAUg") Ownable(owner_) {
        require(
            identityRegistry_ != address(0) && compliance_ != address(0) && trustedIssuers_ != address(0),
            "GoldToken: zero dependency"
        );
        identityRegistry = IIdentityRegistry(identityRegistry_);
        compliance = ICompliance(compliance_);
        trustedIssuers = ITrustedIssuers(trustedIssuers_);
    }
    // Display symbol is "XAU.g"; the on-chain ERC-20 symbol is "XAUg" (no dot,
    // for explorer/wallet compatibility).

    // ----------------------------- Issuance ---------------------------------

    function mint(address to, uint256 amount) external onlyTrustedIssuer whenNotPaused nonReentrant {
        _mint(to, amount); // _update enforces verified recipient + compliance
        compliance.created(to, amount);
        emit Minted(to, amount);
    }

    function burn(address from, uint256 amount) external onlyTrustedIssuer nonReentrant {
        _burn(from, amount);
        compliance.destroyed(from, amount);
        emit Burned(from, amount);
    }

    // --------------------- ERC-20 transfers (guarded) -----------------------

    function transfer(address to, uint256 value) public override nonReentrant returns (bool) {
        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public override nonReentrant returns (bool) {
        return super.transferFrom(from, to, value);
    }

    // ----------------------------- Freezing ---------------------------------

    function setAddressFrozen(address user, bool isFrozen) external onlyAgent {
        frozen[user] = isFrozen;
        emit AddressFrozen(user, isFrozen);
    }

    function freezePartialTokens(address user, uint256 amount) external onlyAgent {
        require(balanceOf(user) >= frozenTokens[user] + amount, "GoldToken: amount exceeds balance");
        frozenTokens[user] += amount;
        emit TokensFrozen(user, amount);
    }

    function unfreezePartialTokens(address user, uint256 amount) external onlyAgent {
        require(frozenTokens[user] >= amount, "GoldToken: amount exceeds frozen");
        frozenTokens[user] -= amount;
        emit TokensUnfrozen(user, amount);
    }

    // ------------------------- Forced transfer ------------------------------

    /// @notice Agent-only transfer that bypasses sender approval, pause and
    ///         freezes (for lost-wallet recovery / regulatory action). The
    ///         recipient must still be verified. In production this is gated by
    ///         multisig (BRS BR-10) — represented off-chain in the POC.
    function forcedTransfer(address from, address to, uint256 amount) external onlyAgent nonReentrant returns (bool) {
        require(identityRegistry.isVerified(to), "GoldToken: recipient not verified");
        uint256 freeBalance = balanceOf(from) - frozenTokens[from];
        if (amount > freeBalance) {
            uint256 toUnfreeze = amount - freeBalance;
            frozenTokens[from] -= toUnfreeze; // reverts if it would underflow (insufficient total)
            emit TokensUnfrozen(from, toUnfreeze);
        }
        _forcing = true;
        _update(from, to, amount);
        _forcing = false;
        compliance.transferred(from, to, amount);
        emit ForcedTransferExecuted(from, to, amount);
        return true;
    }

    // ------------------------------ Pause -----------------------------------

    function pause() external onlyAgent {
        _pause();
    }

    function unpause() external onlyAgent {
        _unpause();
    }

    // -------------------------- Admin setters -------------------------------

    function setIdentityRegistry(address registry_) external onlyOwner {
        require(registry_ != address(0), "GoldToken: zero address");
        identityRegistry = IIdentityRegistry(registry_);
        emit IdentityRegistrySet(registry_);
    }

    function setCompliance(address compliance_) external onlyOwner {
        require(compliance_ != address(0), "GoldToken: zero address");
        compliance = ICompliance(compliance_);
        emit ComplianceSet(compliance_);
    }

    // --------------------------- Transfer gate ------------------------------

    /// @dev Central ERC-3643 enforcement point (OZ v5 routes mint/burn/transfer
    ///      through `_update`).
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            // transfer (ordinary, or forced when _forcing == true)
            require(identityRegistry.isVerified(to), "GoldToken: recipient not verified");
            if (!_forcing) {
                require(!paused(), "GoldToken: token paused");
                require(!frozen[from], "GoldToken: sender frozen");
                require(!frozen[to], "GoldToken: recipient frozen");
                require(balanceOf(from) - frozenTokens[from] >= value, "GoldToken: insufficient unfrozen balance");
                require(compliance.canTransfer(from, to, value), "GoldToken: transfer not compliant");
            }
        } else if (from == address(0)) {
            // mint
            require(identityRegistry.isVerified(to), "GoldToken: recipient not verified");
            require(!frozen[to], "GoldToken: recipient frozen");
            require(compliance.canTransfer(address(0), to, value), "GoldToken: mint not compliant");
        }
        // burn (to == address(0)): no extra checks; only reachable via burn() by a trusted issuer

        super._update(from, to, value);

        // accounting hook for ordinary transfers (forced path calls it itself)
        if (!_forcing && from != address(0) && to != address(0)) {
            compliance.transferred(from, to, value);
        }
    }
}
