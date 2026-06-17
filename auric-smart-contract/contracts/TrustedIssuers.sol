// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITrustedIssuers} from "./interfaces/ITrustedIssuers.sol";

/// @title TrustedIssuers
/// @notice Registry of addresses authorised to mint/burn XAU.g. Per BR-11 this
///         must contain only the Auric Token Engine's minter address — minting
///         is exclusive to the issuer (BRS FR-MINT-07).
contract TrustedIssuers is Ownable, ITrustedIssuers {
    mapping(address => bool) private _trusted;

    event TrustedIssuerAdded(address indexed issuer);
    event TrustedIssuerRemoved(address indexed issuer);

    constructor(address owner_) Ownable(owner_) {}

    function addTrustedIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "TrustedIssuers: zero address");
        _trusted[issuer] = true;
        emit TrustedIssuerAdded(issuer);
    }

    function removeTrustedIssuer(address issuer) external onlyOwner {
        _trusted[issuer] = false;
        emit TrustedIssuerRemoved(issuer);
    }

    function isTrustedIssuer(address issuer) external view returns (bool) {
        return _trusted[issuer];
    }
}
