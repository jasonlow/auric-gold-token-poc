// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AgentRole} from "./roles/AgentRole.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/// @title IdentityRegistry
/// @notice Maps wallets to verified KYC identities. Agents (the Token Engine /
///         admin) register, update and remove identities. Only a KYC *hash* is
///         stored on-chain — never raw PII.
contract IdentityRegistry is AgentRole, IIdentityRegistry {
    struct Identity {
        bytes32 kycHash; // hash of off-chain KYC record (no PII on-chain)
        uint16 country; // ISO 3166-1 numeric
        bool accredited;
        uint64 expiry; // 0 = no expiry; otherwise unix time after which not verified
        bool exists;
    }

    mapping(address => Identity) private _identities;

    event IdentityRegistered(address indexed user, uint16 country, bool accredited);
    event IdentityUpdated(address indexed user, uint16 country, bool accredited, uint64 expiry);
    event IdentityRemoved(address indexed user);

    constructor(address owner_) Ownable(owner_) {}

    function registerIdentity(
        address user,
        bytes32 kycHash,
        uint16 country,
        bool accredited,
        uint64 expiry
    ) external onlyAgent {
        require(user != address(0), "IdentityRegistry: zero address");
        _identities[user] = Identity(kycHash, country, accredited, expiry, true);
        emit IdentityRegistered(user, country, accredited);
    }

    function updateIdentity(
        address user,
        uint16 country,
        bool accredited,
        uint64 expiry
    ) external onlyAgent {
        require(_identities[user].exists, "IdentityRegistry: not registered");
        Identity storage id = _identities[user];
        id.country = country;
        id.accredited = accredited;
        id.expiry = expiry;
        emit IdentityUpdated(user, country, accredited, expiry);
    }

    function deleteIdentity(address user) external onlyAgent {
        require(_identities[user].exists, "IdentityRegistry: not registered");
        delete _identities[user];
        emit IdentityRemoved(user);
    }

    function isVerified(address user) external view returns (bool) {
        Identity storage id = _identities[user];
        if (!id.exists) return false;
        if (id.expiry != 0 && block.timestamp >= id.expiry) return false;
        return true;
    }

    function investorCountry(address user) external view returns (uint16) {
        return _identities[user].country;
    }

    function isAccredited(address user) external view returns (bool) {
        return _identities[user].accredited;
    }

    function kycHashOf(address user) external view returns (bytes32) {
        return _identities[user].kycHash;
    }
}
