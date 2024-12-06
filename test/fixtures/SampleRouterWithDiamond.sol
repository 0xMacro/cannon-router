//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// GENERATED CODE - do not edit manually!!
// This code was generated by the Synthetix router project and deployed with Cannon.
// Learn more: https://usecannon.com/learn/guides/router
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

contract SampleRouterWithDiamond {
    error UnknownSelector(bytes4 sel);

    address immutable private _ROUTER_ADDRESS;

    constructor() {
        _ROUTER_ADDRESS = address(this);
        _emitDiamondCutEvent();
    }

    address private constant _SAMPLE_MODULE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    fallback(bytes calldata cd) external payable returns (bytes memory) {
        // Lookup table: Function selector => implementation contract
        bytes4 sig4 = msg.sig;
        address implementation;

        assembly {
            let sig32 := shr(224, sig4)

            function findImplementation(sig) -> result {
                switch sig
                case 0x2d22bef9 { result := _SAMPLE_MODULE } // SampleModule.initOrUpgradeNft()
                case 0x60988e09 { result := _SAMPLE_MODULE } // SampleModule.getAssociatedSystem()
                case 0xc6f79537 { result := _SAMPLE_MODULE } // SampleModule.initOrUpgradeToken()
                case 0xd245d983 { result := _SAMPLE_MODULE } // SampleModule.registerUnmanagedSystem()
                leave
            }

            implementation := findImplementation(sig32)
        }

        if (implementation == address(0)) {
            // Check for diamond compat call
            if (sig4 == 0x7a0ed627) {
                return abi.encode(_facets());
            }
            if (sig4 == 0xadfca15e) {
                (address facet) = abi.decode(cd[4:], (address));
                return abi.encode(_facetFunctionSelectors(facet));
            }
            if (sig4 == 0x52ef6b2c) {
                return abi.encode(_facetAddresses());
            }
            if (sig4 == 0xcdffacc6) {
                (bytes4 sig) = abi.decode(cd[4:], (bytes4));
                return abi.encode(_facetAddress(sig));
            }
            if (sig4 == 0x8cce96cb) {
                return abi.encode(_emitDiamondCutEvent());
            }
            revert UnknownSelector(sig4);
        }

        // Delegatecall to the implementation contract
        assembly {
            calldatacopy(0, 0, calldatasize())

            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    enum FacetCutAction {Add, Replace, Remove}
    // Add=0, Replace=1, Remove=2

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    /// @notice Gets all facet addresses and their four byte function selectors.
    /// @return facets Facet
    function _facets() internal pure returns (Facet[] memory facets) {
        facets = new Facet[](1);
        bytes4[] memory selectors;
        selectors = new bytes4[](4);
        selectors[0] = 0x60988e09;
        selectors[1] = 0x2d22bef9;
        selectors[2] = 0xc6f79537;
        selectors[3] = 0xd245d983;
        facets[0] = Facet(_SAMPLE_MODULE, selectors);
    }

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param _facet The facet address.
    /// @return facetFunctionSelectors_
    function _facetFunctionSelectors(address _facet) internal pure returns (bytes4[] memory facetFunctionSelectors_) {
        Facet[] memory facets = _facets();
        for (uint256 i = 0;i < facets.length;i++) {
            if (facets[i].facetAddress == _facet) {
                return facets[i].functionSelectors;
            }
        }
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetAddresses_
    function _facetAddresses() internal pure returns (address[] memory facetAddresses_) {
        facetAddresses_ = new address[](1);
        facetAddresses_[0] = _SAMPLE_MODULE;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param _functionSelector The function selector.
    /// @return facetAddress_ The facet address.
    function _facetAddress(bytes4 _functionSelector) internal pure returns (address facetAddress_) {
        Facet[] memory facets = _facets();
        for (uint256 i = 0;i < facets.length;i++) {
            for (uint256 j = 0;j < facets[i].functionSelectors.length;j++) {
                if (facets[i].functionSelectors[j] == _functionSelector) {
                    return facets[i].facetAddress;
                }
            }
        }
    }

    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);

    /// @notice Emits the cut events that would be emitted if this was actually a diamond
    function _emitDiamondCutEvent() internal returns (bool) {
        Facet[] memory facets = _facets();
        FacetCut[] memory cuts = new FacetCut[](2);
        cuts[0] = FacetCut(facets[0].facetAddress, FacetCutAction.Add, facets[0].functionSelectors);
        emit DiamondCut(cuts, address(0), new bytes(0));
        return true;
    }
}
