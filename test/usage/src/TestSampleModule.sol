// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ISampleModule.sol";

contract TestSampleModule is ISampleModule {
    struct SystemInfo {
        address addr;
        bytes32 kind;
        uint8 decimals;
        bool initialized;
    }

    mapping(bytes32 => SystemInfo) internal systems;

    mapping(bytes32 => string) internal names;
    mapping(bytes32 => string) internal symbols;
    mapping(bytes32 => string) internal uris;

    function getAssociatedSystem(bytes32 id) external view returns (address addr, bytes32 kind) {
        SystemInfo storage system = systems[id];
        return (system.addr, system.kind);
    }

    function initOrUpgradeNft(
        bytes32 id,
        string memory name,
        string memory symbol,
        string memory uri,
        address impl
    ) external {
        systems[id] = SystemInfo({
            addr: address(this),
            kind: keccak256("nft"),
            decimals: 0,
            initialized: true
        });

        names[id] = name;
        symbols[id] = symbol;
        uris[id] = uri;

        emit AssociatedSystemSet(systems[id].kind, id, address(this), impl);
    }

    function initOrUpgradeToken(
        bytes32 id,
        string memory name,
        string memory symbol,
        uint8 _decimals,
        address impl
    ) external {
        systems[id] = SystemInfo({
            addr: address(this),
            kind: keccak256("token"),
            decimals: _decimals,
            initialized: true
        });

        names[id] = name;
        symbols[id] = symbol;

        emit AssociatedSystemSet(systems[id].kind, id, address(this), impl);
    }

    function registerUnmanagedSystem(bytes32, address) external pure {
        revert("test_revert");
    }
}
