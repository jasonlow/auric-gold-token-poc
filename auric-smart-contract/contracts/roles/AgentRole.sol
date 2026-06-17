// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentRole
/// @notice Owner-managed set of "agents" (operational roles) — the ERC-3643 model
///         where the issuer/operator (e.g. the Auric Token Engine) performs
///         registry and token admin actions. The owner manages the agent set.
abstract contract AgentRole is Ownable {
    mapping(address => bool) private _agents;

    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    modifier onlyAgent() {
        require(_agents[msg.sender], "AgentRole: caller is not an agent");
        _;
    }

    function isAgent(address agent) public view returns (bool) {
        return _agents[agent];
    }

    function addAgent(address agent) external onlyOwner {
        require(agent != address(0), "AgentRole: zero address");
        _agents[agent] = true;
        emit AgentAdded(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        _agents[agent] = false;
        emit AgentRemoved(agent);
    }
}
