// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ITrustedIssuers
/// @notice Registry of addresses authorised to mint/burn XAU.g. Per Auric's model
///         (BRS glossary + BR-11) this list must contain only the Auric Token
///         Engine's minter address — minting is exclusive to the issuer.
interface ITrustedIssuers {
    function isTrustedIssuer(address issuer) external view returns (bool);
}
