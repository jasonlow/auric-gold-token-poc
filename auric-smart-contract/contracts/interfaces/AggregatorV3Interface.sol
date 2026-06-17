// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AggregatorV3Interface
/// @notice Standard Chainlink price-feed interface. Declared locally so the POC
///         doesn't depend on the full Chainlink contracts npm package; the mock
///         and the real Chainlink XAU/USD feed are interchangeable behind it.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    function getRoundData(
        uint80 _roundId
    )
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
