// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICompliance
/// @notice Modular compliance rules checked by the token on every transfer/mint.
///         Mirrors the ERC-3643 ModularCompliance hook surface. Identity
///         verification (whitelist) is checked separately via IIdentityRegistry;
///         this module enforces jurisdiction, accreditation and limits.
interface ICompliance {
    /// @return true if a transfer (or mint, when `from` is the zero address) is allowed
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);

    // Accounting hooks invoked by the token after a successful action.
    function transferred(address from, address to, uint256 amount) external;
    function created(address to, uint256 amount) external;
    function destroyed(address from, uint256 amount) external;
}
