// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICompliance} from "./interfaces/ICompliance.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/// @title ComplianceModule
/// @notice Enforces jurisdiction allowlist and accreditation on transfers/mints.
///         Rules are updatable by the owner WITHOUT redeploying the token
///         (BRS FR-ADM-05 / NFR-SCA-04). Identity verification (whitelist) is
///         handled by the token via IIdentityRegistry; this adds the rule layer.
contract ComplianceModule is Ownable, ICompliance {
    IIdentityRegistry public immutable identityRegistry;
    address public token; // bound token allowed to call the accounting hooks

    mapping(uint16 => bool) public allowedCountry; // ISO 3166-1 numeric => allowed
    bool public requireAccredited;

    event TokenBound(address indexed token);
    event CountryAllowed(uint16 indexed country, bool allowed);
    event RequireAccreditedSet(bool required);

    constructor(address owner_, address identityRegistry_) Ownable(owner_) {
        require(identityRegistry_ != address(0), "ComplianceModule: zero registry");
        identityRegistry = IIdentityRegistry(identityRegistry_);
        requireAccredited = true; // pilot default: accredited investors only (BR-04)
    }

    function bindToken(address token_) external onlyOwner {
        require(token_ != address(0), "ComplianceModule: zero token");
        token = token_;
        emit TokenBound(token_);
    }

    function setCountryAllowed(uint16 country, bool allowed) external onlyOwner {
        allowedCountry[country] = allowed;
        emit CountryAllowed(country, allowed);
    }

    function setRequireAccredited(bool required) external onlyOwner {
        requireAccredited = required;
        emit RequireAccreditedSet(required);
    }

    /// @inheritdoc ICompliance
    function canTransfer(address, address to, uint256) external view returns (bool) {
        if (to == address(0)) return true; // burn
        if (!allowedCountry[identityRegistry.investorCountry(to)]) return false;
        if (requireAccredited && !identityRegistry.isAccredited(to)) return false;
        return true;
    }

    // --- Accounting hooks (no-ops in the POC; reserved for limits/counters) ---
    // Restricted to the bound token to mirror ERC-3643 ModularCompliance.
    modifier onlyToken() {
        require(msg.sender == token, "ComplianceModule: caller is not the token");
        _;
    }

    function transferred(address, address, uint256) external onlyToken {}

    function created(address, uint256) external onlyToken {}

    function destroyed(address, uint256) external onlyToken {}
}
