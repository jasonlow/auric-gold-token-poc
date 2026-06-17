// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @title MockV3Aggregator
/// @notice Test-only Chainlink-compatible price feed (e.g. XAU/USD). The price is
///         settable via `updateAnswer` so POC scenarios can control gold pricing,
///         including staleness tests. Mirrors Chainlink's MockV3Aggregator so it
///         is a drop-in for the real feed behind AggregatorV3Interface.
///         NOTE: XAU/USD is priced per troy ounce; the Token Engine converts to
///         per-gram and applies USD->SGD FX (BRS FR-ORC-06).
contract MockV3Aggregator is AggregatorV3Interface {
    uint256 public constant override version = 0;

    uint8 public immutable override decimals;
    string private _description;

    uint80 private _latestRound;
    mapping(uint80 => int256) private _answers;
    mapping(uint80 => uint256) private _startedAt;
    mapping(uint80 => uint256) private _updatedAt;

    event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt);

    constructor(uint8 decimals_, int256 initialAnswer_, string memory description_) {
        decimals = decimals_;
        _description = description_;
        _updateAnswer(initialAnswer_);
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    /// @notice Set a new price (scaled to `decimals`). Test-only — unrestricted.
    function updateAnswer(int256 answer) external {
        _updateAnswer(answer);
    }

    function _updateAnswer(int256 answer) internal {
        _latestRound++;
        _answers[_latestRound] = answer;
        _startedAt[_latestRound] = block.timestamp;
        _updatedAt[_latestRound] = block.timestamp;
        emit AnswerUpdated(answer, _latestRound, block.timestamp);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        roundId = _latestRound;
        return (roundId, _answers[roundId], _startedAt[roundId], _updatedAt[roundId], roundId);
    }

    function getRoundData(
        uint80 roundId_
    )
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (roundId_, _answers[roundId_], _startedAt[roundId_], _updatedAt[roundId_], roundId_);
    }
}
