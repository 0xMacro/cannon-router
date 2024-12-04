> This project is a fork of [https://github.com/Synthetixio/synthetix-router](Synthetixio/synthetix-router) but striping out all the tests helpers for hardhat and contract compilation, leaving only the generation of the Router contract.

# router

Solidity router generator.

## Description

This plugin generates a router contract which simply merges multiple contracts (modules) behind a single proxy.

The router proxy receives incoming calls and forwards them to the appropriate implementation or module, depending on which one contains the incoming function selector.

Example:
A user calls the `rebalancePool()` function on a deployed router, which merges 3 modules; A.sol, B.sol, and C.sol. The router determines that the function `rebalancePool` is defined in module B.sol. So, the router simply performs a `DELEGATECALL` to B's deployed instance.

This router is similar to the [Diamond Proxy](https://eips.ethereum.org/EIPS/eip-2535) but:

- is simpler
  - because it has no module management interface
- more explicit
  - because its modular composition can easily be seen by looking at its hardcoded module addresses
- more efficient
  - because it hardcodes the deployed module addresses, minimizing `SLOAD` usage

### Module deployment

The plugin will consider any contract inside a `modules` folder (configurable) a module, and automatically detect if its bytecode has changed and deploy it.

### Router generation

After module deployment, the router's source code is generated with Diamond support by the plugin. Generation will fail under certain conditions, e.g. if two of the modules contain the same selector, or a function with the same name.

Example output:

```
contract Router {
    error UnknownSelector(bytes4 sel);

    address immutable private _ROUTER_ADDRESS;

    constructor() {
        _ROUTER_ADDRESS = address(this);

        bytes4[] memory selectors;
        selectors = new bytes4[](4);
        selectors[0] = 0x60988e09;
        selectors[1] = 0x2d22bef9;
        selectors[2] = 0xc6f79537;
        selectors[3] = 0xd245d983;
        _facets().push(Facet(_SAMPLE_MODULE, selectors));
        selectors = new bytes4[](4);
        selectors[0] = 0xad55cd0a;
        selectors[1] = 0xcfae3217;
        selectors[2] = 0x26ffaa03;
        selectors[3] = 0xa4136862;
        _facets().push(Facet(_GREETER_MODULE, selectors));

        _emitDiamondCutEvent();
    }

    address private constant _SAMPLE_MODULE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address private constant _GREETER_MODULE = 0x703aef879107aDE9820A795d3a6C36d6B9CC2B97;

    fallback(bytes calldata cd) external payable returns (bytes memory) {
        // Lookup table: Function selector => implementation contract
        bytes4 sig4 = msg.sig;
        address implementation;

        assembly {
            let sig32 := shr(224, sig4)

            function findImplementation(sig) -> result {
                switch sig
                case 0x26ffaa03 { result := _GREETER_MODULE } // GreeterModule.greetings()
                case 0x2d22bef9 { result := _SAMPLE_MODULE } // SampleModule.initOrUpgradeNft()
                case 0x60988e09 { result := _SAMPLE_MODULE } // SampleModule.getAssociatedSystem()
                case 0xa4136862 { result := _GREETER_MODULE } // GreeterModule.setGreeting()
                case 0xad55cd0a { result := _GREETER_MODULE } // GreeterModule.greet()
                case 0xc6f79537 { result := _SAMPLE_MODULE } // SampleModule.initOrUpgradeToken()
                case 0xcfae3217 { result := _GREETER_MODULE } // GreeterModule.greet()
                case 0xd245d983 { result := _SAMPLE_MODULE } // SampleModule.registerUnmanagedSystem()
                leave
            }

            implementation := findImplementation(sig32)
        }

        if (implementation == address(0)) {
            // It's possible this contract is being called through yet another proxy. Call the router in order to make sure we have right data.
            if (address(this) != _ROUTER_ADDRESS) {
                (bool success, bytes memory result) = _ROUTER_ADDRESS.call(cd);
                if (success) {
                    return result;
                } else {
                    revert UnknownSelector(sig4);
                }
            } else {
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
    /// @return facets_ Facet
    function _facets() internal pure returns (Facet[] storage facets_) {
        bytes32 s = keccak256("Router.ComplexRouterWithDiamond");
        assembly {
            facets_.slot := s
        }
    }

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param _facet The facet address.
    /// @return facetFunctionSelectors_
    function _facetFunctionSelectors(address _facet) internal view returns (bytes4[] memory facetFunctionSelectors_) {
        Facet[] storage facets = _facets();
        for (uint256 i = 0;i < facets.length;i++) {
            if (facets[i].facetAddress == _facet) {
                return facets[i].functionSelectors;
            }
        }
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetAddresses_
    function _facetAddresses() internal pure returns (address[] memory facetAddresses_) {
        facetAddresses_ = new address[](2);
        facetAddresses_[0] = _SAMPLE_MODULE;
        facetAddresses_[1] = _GREETER_MODULE;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param _functionSelector The function selector.
    /// @return facetAddress_ The facet address.
    function _facetAddress(bytes4 _functionSelector) internal view returns (address facetAddress_) {
        Facet[] storage facets = _facets();
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
        FacetCut[] memory cuts = new FacetCut[](2);
        cuts[0] = FacetCut(_SAMPLE_MODULE, FacetCutAction.Add, _facetFunctionSelectors(_SAMPLE_MODULE));
        cuts[1] = FacetCut(_GREETER_MODULE, FacetCutAction.Add, _facetFunctionSelectors(_GREETER_MODULE));
        emit DiamondCut(cuts, address(0), new bytes(0));
        return true;
    }
}
```

### Router validation

After generation, the plugin performs a series of validations on the generated source, including:

- Checks that there are no duplicate selectors in its modules (function names must be unique)
- That there are no storage collisions between module namespaces
- That there are no invalid storage mutations between module namespaces
- TODO: Complete list of validations

### Storage namespaces

To avoid storage collisions between modules, we recommend the usage of storage namespaces.

Instead of declaring variables in regular Solidity slots:

```
contract SettingsModule {
	uint private _someSetting;

  function setSomeSetting(uint newValue) external {
    _someSetting = newValue;
  }

  function getSomeSetting() external view returns (uint) {
    return _someSetting;
  }
}
```

Use a store:

```
contract SettingsModule is SettingsStorage {
	function setSomeSetting(uint newValue) external {
    _settingsStore().someSetting = newValue;
  }

  function getSomeSetting() external view returns (uint) {
    return _settingsStore().someSetting;
  }
}

contract SettingsStorage {
  struct SettingsStore {
    uint someSetting;
  }

  function _settingsStore() internal pure returns (ProxyStore storage store) {
    assembly {
      // bytes32(uint(keccak256("io.synthetix.settings")) - 1)
      store.slot = 0x312...
    }
  }
}
```

### Inter-modular communication and mixins

Since the router `DELEGATECALL`s to its implementation modules, all code specified by its modules will be run within a single execution context. If the router is used directly, it will be the execution context. If something is `DELEGATECALL`ing the router, then that will be the execution context. E.g. a proxy.

Thus, all modules have access to the global storage of the system. Instead of performing calls to other modules, it is recommended to use Mixins that know how to interact with the storage of another module.

E.g.

```
contract OwnableMixin is OwnableStorage {
  modifier onlyOwner() {
    require(msg.sender == _ownerStore().owner, "Only owner allowed");
    _;
  }
}
```

```
contract SynthsModule is SynthsStorage, OwnableMixin {
  function createSynth(...) external onlyOwner {
    ...
  }
}
```

### No constructors

Since the router `DELEGATECALL`s to its modules, they storage will never be used. Any storage that may have been set by a constructor during module deployment will be ignored. Thus, we recommend to avoid using constructors in modules, and use initializer functions instead.

### Upgradeability

If the router is used as the implementation of a UUPS [Universal Upgradeable Proxy Standard](https://eips.ethereum.org/EIPS/eip-1822) proxy, and includes an UpgradeModule, it can be used to design complex systems which are upgradeable until the main proxy is upgraded to a router implementation that no longer has an UpgradeModule.

⚠️ Make sure that the UUPS contract does not contain public facing functions becuase they could clash with function signatures from the implementation modules. ⚠️
