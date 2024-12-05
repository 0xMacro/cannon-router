// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISampleModule {
    // Custom errors
    error MismatchAssociatedSystemKind(bytes32 expected, bytes32 actual);
    error Unauthorized(address addr);

    // Events
    event AssociatedSystemSet(
        bytes32 indexed kind,
        bytes32 indexed id,
        address proxy,
        address impl
    );

    // View functions
    function getAssociatedSystem(bytes32 id) external view returns (address addr, bytes32 kind);

    // State-changing functions
    function initOrUpgradeNft(
        bytes32 id,
        string memory name,
        string memory symbol,
        string memory uri,
        address impl
    ) external;

    function initOrUpgradeToken(
        bytes32 id,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address impl
    ) external;

    function registerUnmanagedSystem(bytes32 id, address endpoint) external;
}
