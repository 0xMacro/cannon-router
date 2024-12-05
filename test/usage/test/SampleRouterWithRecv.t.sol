// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/TestSampleModule.sol";
import "../src/fixtures/SampleRouterWithRecv.sol";
import "../src/interfaces/ISampleModule.sol";

contract TestProxySetup is Test {
    address constant SAMPLE_MODULE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    TestSampleModule public implementation;
    SampleRouterWithRecv public router;
    ISampleModule public proxy;

    event AssociatedSystemSet(
        bytes32 indexed kind,
        bytes32 indexed id,
        address proxy,
        address impl
    );

    function setUp() public {
        implementation = new TestSampleModule();
        router = new SampleRouterWithRecv();
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

    function testReceiveEth() public {
        // Contract can receive eth. Send and check balance
        (bool success, ) = payable(address(proxy)).call{value: 1 ether}("");
        assertTrue(success, "send eth failed");
        assertEq(address(proxy).balance, 1 ether);
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
            abi.encodeWithSelector(SampleRouterWithRecv.UnknownSelector.selector, selector)
        );
        (bool revertAsExpected, ) = address(proxy).call(callData);
        assertTrue(revertAsExpected, "expectRevert: call did not revert");
    }
}
