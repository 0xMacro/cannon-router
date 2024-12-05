// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/TestSampleModule.sol";
import "../src/fixtures/SampleRouterWithDiamond.sol";
import "../src/interfaces/IDiamond.sol";
import "../src/interfaces/ISampleModule.sol";

contract TestSampleRouterWithDiamond is Test {
    address constant SAMPLE_MODULE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    TestSampleModule public implementation;
    SampleRouterWithDiamond public router;
    ISampleModule public proxy;

    event AssociatedSystemSet(
        bytes32 indexed kind,
        bytes32 indexed id,
        address proxy,
        address impl
    );

    function setUp() public {
        implementation = new TestSampleModule();
        router = new SampleRouterWithDiamond();
        // proxy = ISampleModule(address(router));
        vm.etch(SAMPLE_MODULE, address(implementation).code);

        // https://eips.ethereum.org/EIPS/eip-1167#specification
        bytes memory bytecode = hex"3d602d80600a3d3981f3363d3d373d3d3d363d73";
        bytecode = abi.encodePacked(
            bytecode,
            uint160(address(router)),
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        address proxyAddr;
        assembly {
            proxyAddr := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(proxyAddr != address(0), "Proxy deployment failed");
        proxy = ISampleModule(proxyAddr);
    }

    function testSendEth() public {
        // Contract CANNOT receive eth. Expect revert and try sending
        (bool success, ) = payable(address(proxy)).call{value: 1 ether}("");
        assertFalse(success);
    }

    function testInitNftThroughProxy() public {
        bytes32 id = keccak256("test.nft");
        string memory name = "Test NFT";
        string memory symbol = "TNFT";
        string memory uri = "https://test.uri";
        address impl = address(0x123);

        vm.expectEmit(true, true, true, true);
        emit AssociatedSystemSet(keccak256("nft"), id, address(proxy), impl);

        proxy.initOrUpgradeNft(id, name, symbol, uri, impl);

        (address addr, bytes32 kind) = proxy.getAssociatedSystem(id);
        assertEq(addr, address(proxy));
        assertEq(kind, keccak256("nft"));
    }

    function testInitTokenThroughProxy() public {
        bytes32 id = keccak256("test.token");
        string memory name = "Test Token";
        string memory symbol = "TT";
        uint8 decimals = 18;
        address impl = address(0x456);

        vm.expectEmit(true, true, true, true);
        emit AssociatedSystemSet(keccak256("token"), id, address(proxy), impl);

        proxy.initOrUpgradeToken(id, name, symbol, decimals, impl);

        (address addr, bytes32 kind) = proxy.getAssociatedSystem(id);
        assertEq(addr, address(proxy));
        assertEq(kind, keccak256("token"));
    }

    function testUnknownSelector() public {
        bytes memory callData = abi.encodeWithSignature("unknownFunction()");
        bytes4 selector = bytes4(callData);

        vm.expectRevert(
            abi.encodeWithSelector(SampleRouterWithDiamond.UnknownSelector.selector, selector)
        );
        (bool revertAsExpected, ) = address(proxy).call(callData);
        assertTrue(revertAsExpected, "expectRevert: call did not revert");
    }

    //
    // Error Handling Tests
    //
    function testRevertMessage() public {
        vm.expectRevert("test_revert");
        implementation.registerUnmanagedSystem(0x0, address(0));
    }

    //
    // Diamond Tests
    //
    function testFacetAddress() public view {
        IDiamond diamond = IDiamond(address(proxy));
        assertEq(diamond.facetAddress(0x2d22bef9), SAMPLE_MODULE);
        assertEq(diamond.facetAddress(0x60988e09), SAMPLE_MODULE);
        assertEq(diamond.facetAddress(0xc6f79537), SAMPLE_MODULE);
        assertEq(diamond.facetAddress(0xd245d983), SAMPLE_MODULE);
        assertEq(diamond.facetAddress(0xdeadbeef), address(0));
    }

    function testFacetFunctionSelectors() public view {
        IDiamond diamond = IDiamond(address(proxy));
        bytes4[] memory selectors = diamond.facetFunctionSelectors(SAMPLE_MODULE);
        assertEq(selectors.length, 4);

        // Current implementation sorts selectors in ascending order
        assertEq(uint32(selectors[0]), uint32(0x60988e09));
        assertEq(uint32(selectors[1]), uint32(0x2d22bef9));
        assertEq(uint32(selectors[2]), uint32(0xc6f79537));
        assertEq(uint32(selectors[3]), uint32(0xd245d983));
    }

    function testFacesAddresses() public view {
        IDiamond diamond = IDiamond(address(proxy));
        address[] memory addresses = diamond.facetAddresses();
        assertEq(addresses.length, 1);
        assertEq(addresses[0], SAMPLE_MODULE);
    }

    function testFacets() public view {
        IDiamond diamond = IDiamond(address(proxy));
        IDiamond.Facet[] memory facets = diamond.facets();
        assertEq(facets.length, 1);
        assertEq(facets[0].facetAddress, SAMPLE_MODULE);

        bytes4[] memory selectors = facets[0].functionSelectors;
        assertEq(selectors.length, 4);

        // Current implementation sorts selectors in ascending order
        assertEq(uint32(selectors[0]), uint32(0x60988e09));
        assertEq(uint32(selectors[1]), uint32(0x2d22bef9));
        assertEq(uint32(selectors[2]), uint32(0xc6f79537));
        assertEq(uint32(selectors[3]), uint32(0xd245d983));
    }
}
