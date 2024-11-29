import { Fragment, FunctionFragment, JsonFragment } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import Mustache from 'mustache';

import { routerTemplate } from '../templates/router';

import { ContractValidationError } from './errors';
import { routerFunctionFilter } from './router-function-filter';
import { toPrivateConstantCase } from './router-helper';

const TAB = '    ';

interface Props {
  routerName?: string;
  template?: string;
  functionFilter?: (fnName: string) => boolean;
  canReceivePlainETH?: boolean;
  hasDiamondCompat?: boolean;
  contracts: ContractData[];
}

export interface ContractData {
  contractName: string;
  deployedAddress: string;
  abi: JsonFragment[];
}

interface FunctionSelector {
  contractName: string;
  name: string;
  selector: string;
}

interface BinaryData {
  selectors: FunctionSelector[];
  children: BinaryData[];
}

export function renderRouter({
  routerName = 'Router',
  template = routerTemplate,
  functionFilter = routerFunctionFilter,
  canReceivePlainETH = false,
  hasDiamondCompat = true,
  contracts,
}: Props) {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    throw new Error(`No contracts found to render during "${routerName}" generation`);
  }

  const selectors = _getAllSelectors(contracts, functionFilter);

  _validateSelectors(selectors);

  const binaryData = _buildBinaryData(selectors);

  return Mustache.render(template, {
    moduleName: routerName,
    modules: _renderModules(contracts, functionFilter),
    selectors: _renderSelectors(binaryData),
    // Note: Plain ETH transfers are disabled by default. Set this to true to
    // enable them. If there is ever a use case for this, it might be a good
    // idea to expose the boolean in the router tool's interface.
    receive: _renderReceive(canReceivePlainETH),
    diamondConstructor: hasDiamondCompat
      ? _renderDiamondConstructor(contracts, functionFilter)
      : undefined,
    diamondCompat: hasDiamondCompat
      ? _renderDiamondCompat(routerName, contracts, functionFilter)
      : undefined,
  });
}

function _getAllSelectors(
  contracts: ContractData[],
  functionFilter: Props['functionFilter']
): FunctionSelector[] {
  return contracts
    .flatMap(({ contractName, abi }) =>
      getSelectors(abi, functionFilter).map((s) => ({
        contractName,
        ...s,
      }))
    )
    .sort((a, b) => {
      return Number.parseInt(a.selector, 16) - Number.parseInt(b.selector, 16);
    });
}

function _renderReceive(canReceivePlainETH: boolean) {
  let receiveStr = '';

  if (canReceivePlainETH) {
    receiveStr += '\n    receive() external payable {}\n';
  }

  return receiveStr;
}

function _renderSelectors(binaryData: BinaryData) {
  let selectorsStr = '';

  function renderNode(node: BinaryData, indent = 0) {
    if (node.children.length > 0) {
      const childA = node.children[0];
      const childB = node.children[1];

      function findMidSelector(node: BinaryData): FunctionSelector {
        if (node.selectors.length > 0) {
          return node.selectors[0];
        } else {
          return findMidSelector(node.children[0]);
        }
      }

      const midSelector = findMidSelector(childB);

      selectorsStr += `\n${TAB.repeat(4 + indent)}if lt(sig,${midSelector.selector}) {`;
      renderNode(childA, indent + 1);
      selectorsStr += `\n${TAB.repeat(4 + indent)}}`;

      renderNode(childB, indent);
    } else {
      selectorsStr += `\n${TAB.repeat(4 + indent)}switch sig`;
      for (const s of node.selectors) {
        selectorsStr += `\n${TAB.repeat(4 + indent)}case ${s.selector} { result := ${toPrivateConstantCase(
          s.contractName
        )} } // ${s.contractName}.${s.name}()`;
      }
      selectorsStr += `\n${TAB.repeat(4 + indent)}leave`;
    }
  }

  renderNode(binaryData, 0);

  return selectorsStr.trim();
}

function _renderDiamondConstructor(
  contractData: ContractData[],
  functionFilter: Props['functionFilter']
) {
  const facets = contractData.map(({ contractName, abi }) => {
    return { contractName, selectors: getSelectors(abi, functionFilter) };
  });
  return `
        bytes4[] memory selectors;
        ${facets
          .map(
            (f, i) =>
              `
              selectors = new bytes4[](${f.selectors.length});
              ${f.selectors.map((s, j) => `${TAB}${TAB}selectors[${j}] = ${s.selector};`).join('\n')}
            _facets().push(Facet(${toPrivateConstantCase(f.contractName)}, selectors));`
          )
          .join('\n        ')}

        _emitDiamondCutEvent();`;
}

function _renderDiamondCompat(
  routerName: string,
  contractData: ContractData[],
  functionFilter: Props['functionFilter']
) {
  const facets = contractData.map(({ contractName, abi }) => {
    return { contractName, selectors: getSelectors(abi, functionFilter) };
  });
  return `
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
    function _facets() internal view returns (Facet[] storage facets_) {
        bytes32 s = keccak256("Router.${routerName}");
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
        facetAddresses_ = new address[](${facets.length});
        ${facets.map((f, i) => `facetAddresses_[${i}] = ${toPrivateConstantCase(f.contractName)};`).join('\n        ')}
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
        FacetCut[] memory cuts = new FacetCut[](${facets.length});
        ${facets.map((f, i) => `cuts[${i}] = FacetCut(${toPrivateConstantCase(f.contractName)}, FacetCutAction.Add, _facetFunctionSelectors(${toPrivateConstantCase(f.contractName)}));`).join('\n        ')}
        emit DiamondCut(cuts, address(0), new bytes(0));
        return true;
    }`;
}

/**
 * Get a string of modules constants with its deployedAddresses.
 * E.g.:
 *   address private constant _ANOTHER_MODULE = 0xAA...;
 *   address private constant _OWNER_MODULE = 0x5c..;
 */
function _renderModules(contracts: ContractData[], functionFilter: Props['functionFilter']) {
  const contractModuleConsts = contracts
    .map(({ contractName, deployedAddress }) => {
      const name = toPrivateConstantCase(contractName);
      return `${TAB}address private constant ${name} = ${deployedAddress};`;
    })
    .join('\n')
    .trim();

  const selectorConsts = contracts
    .map(({ abi }) => {
      return getSelectors(abi, functionFilter).map(
        (s) => `${TAB}bytes4 private constant ${s.selector} = ${s.selector};`
      );
    })
    .flat()
    .join('\n')
    .trim();

  return `${contractModuleConsts}`;
}

function _buildBinaryData(selectors: FunctionSelector[]) {
  const maxSelectorsPerSwitchStatement = 9;

  function binarySplit(node: BinaryData) {
    if (node.selectors.length > maxSelectorsPerSwitchStatement) {
      const midIdx = Math.ceil(node.selectors.length / 2);

      const childA = binarySplit({
        selectors: node.selectors.splice(0, midIdx),
        children: [],
      });

      const childB = binarySplit({
        selectors: node.selectors.splice(-midIdx),
        children: [],
      });

      node.children.push(childA);
      node.children.push(childB);

      node.selectors = [];
    }

    return node;
  }

  const binaryData = {
    selectors,
    children: [],
  };

  const finalData = binarySplit(binaryData);

  return finalData;
}

export function getSelectors(
  contractAbi: JsonFragment[],
  functionFilter: (fnName: string) => boolean = () => true
) {
  return contractAbi
    .filter(
      (fragment) =>
        fragment.type === 'function' &&
        typeof fragment.name === 'string' &&
        functionFilter(fragment.name)
    )
    .map((fragment) => {
      return {
        name: fragment.name,
        selector: _getFunctionSelector(fragment as FunctionFragment),
      };
    }) as {
    name: string;
    selector: string;
  }[];
}

function _getFunctionSelector(fragment: FunctionFragment) {
  return keccak256(Buffer.from(Fragment.fromObject(fragment).format())).slice(0, 10);
}

function _validateSelectors(selectors: FunctionSelector[]) {
  const repeated = new Set(selectors.map((s) => s.selector).filter(_onlyRepeated));

  if (!repeated.size) return;

  const list = selectors
    .filter((s) => repeated.has(s.selector))
    .map((s) => `  ${s.selector} // ${s.contractName}.${s.name}()`)
    .join('\n');

  throw new ContractValidationError(
    `The following contracts have repeated function selectors behind the same Router:\n${list}\n`
  );
}

function _onlyRepeated<T>(value: T, index: number, self: T[]) {
  const last = self.lastIndexOf(value);
  return self.indexOf(value) !== last && index === last;
}
