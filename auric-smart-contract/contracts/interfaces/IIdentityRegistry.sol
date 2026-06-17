// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IIdentityRegistry
/// @notice On-chain registry of whitelisted wallets and their KYC identity data.
///         Only a verified wallet may hold or receive XAU.g. Raw PII never goes
///         on-chain — only a KYC hash (see BRS NFR-DAT / data sovereignty).
interface IIdentityRegistry {
    /// @return true if the wallet is registered and not expired (i.e. may hold tokens)
    function isVerified(address user) external view returns (bool);

    /// @return ISO 3166-1 numeric country code recorded for the wallet
    function investorCountry(address user) external view returns (uint16);

    /// @return true if the wallet is flagged as an accredited investor
    function isAccredited(address user) external view returns (bool);
}
