import { deepEqual, throws } from 'node:assert/strict';

import GreeterModuleABI from '../fixtures/GreeterModuleABI.json';
import SampleModuleABI from '../fixtures/SampleModuleABI.json';
import { ContractValidationError } from '../../src/internal/errors';
import { generateRouter } from '../../src/generate';
import { loadFile } from './helpers';

describe('src/generate.ts', function () {
  it('throw an error when generating a router with repeated selectors', async function () {
    throws(() => {
      generateRouter({
        contracts: [
          {
            abi: SampleModuleABI,
            deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
            contractName: 'SampleModule',
            sourceName: 'contracts/modules/SampleModule.sol',
            contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
          },
          {
            abi: SampleModuleABI,
            deployedAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
            deployTxnHash: '0x9f8838e6683ef2ff84a0daaef5f85a86545acb934045140054daaf9a858c48a8',
            contractName: 'RepeatedModule',
            sourceName: 'contracts/modules/RepeatedModule.sol',
            contractFullyQualifiedName: 'contracts/modules/RepeatedModule.sol:RepeatedModule',
          },
        ],
      });
    }, ContractValidationError);
  });

  it('correctly generates SampleRouter.sol', async function () {
    const expected = await loadFile('../fixtures/SampleRouter.sol');
    const result = generateRouter({
      contractName: 'SampleRouter',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
      ],
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });

  it('correctly generates ComplexRouter.sol', async function () {
    const expected = await loadFile('../fixtures/ComplexRouter.sol');
    const result = generateRouter({
      contractName: 'ComplexRouter',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
        {
          abi: GreeterModuleABI,
          deployedAddress: '0x703aef879107aDE9820A795d3a6C36d6B9CC2B97',
          deployTxnHash: '0x5479a53f34fc89422c5b64a277bf45f146c091323b573324b853e152bc804842',
          contractName: 'GreeterModule',
          sourceName: 'contracts/modules/GreeterModule.sol',
          contractFullyQualifiedName: 'contracts/modules/GreeterModule.sol:GreeterModule',
        },
      ],
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });

  it('generates with receive eth capability SampleRouterWithRecv.sol', async function () {
    const expected = await loadFile('../fixtures/SampleRouterWithRecv.sol');
    const result = generateRouter({
      contractName: 'SampleRouterWithRecv',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
      ],
      canReceivePlainETH: true,
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });

  it('generates with receive eth capability ComplexRouterWithRecv.sol', async function () {
    const expected = await loadFile('../fixtures/ComplexRouterWithRecv.sol');
    const result = generateRouter({
      contractName: 'ComplexRouterWithRecv',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
        {
          abi: GreeterModuleABI,
          deployedAddress: '0x703aef879107aDE9820A795d3a6C36d6B9CC2B97',
          deployTxnHash: '0x5479a53f34fc89422c5b64a277bf45f146c091323b573324b853e152bc804842',
          contractName: 'GreeterModule',
          sourceName: 'contracts/modules/GreeterModule.sol',
          contractFullyQualifiedName: 'contracts/modules/GreeterModule.sol:GreeterModule',
        },
      ],
      canReceivePlainETH: true,
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });

  it('generates with diamond capability SampleRouterWithDiamond.sol', async function () {
    const expected = await loadFile('../fixtures/SampleRouterWithDiamond.sol');
    const result = generateRouter({
      contractName: 'SampleRouterWithDiamond',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
      ],
      hasDiamondCompat: true,
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });

  it('generates with diamond capability ComplexRouterWithDiamond.sol', async function () {
    const expected = await loadFile('../fixtures/ComplexRouterWithDiamond.sol');
    const result = generateRouter({
      contractName: 'ComplexRouterWithDiamond',
      contracts: [
        {
          abi: SampleModuleABI,
          deployedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          deployTxnHash: '0x849b033c0ee690c8b9a53057495d9b3e16588a26d51a7cad4dfc6cd3d310ce0e',
          contractName: 'SampleModule',
          sourceName: 'contracts/modules/SampleModule.sol',
          contractFullyQualifiedName: 'contracts/modules/SampleModule.sol:SampleModule',
        },
        {
          abi: GreeterModuleABI,
          deployedAddress: '0x703aef879107aDE9820A795d3a6C36d6B9CC2B97',
          deployTxnHash: '0x5479a53f34fc89422c5b64a277bf45f146c091323b573324b853e152bc804842',
          contractName: 'GreeterModule',
          sourceName: 'contracts/modules/GreeterModule.sol',
          contractFullyQualifiedName: 'contracts/modules/GreeterModule.sol:GreeterModule',
        },
      ],
      hasDiamondCompat: true,
    });

    try {
      deepEqual(result, expected);
    } catch (err) {
      console.log(result);
      throw err;
    }
  });
});
