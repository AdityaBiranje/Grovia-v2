// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";

contract GroviaGovernor is
    Governor,
    GovernorVotes,
    GovernorCountingSimple,
    GovernorTimelockControl
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("GroviaGovernor")
        GovernorVotes(_token)
        GovernorTimelockControl(_timelock)
    {}

    // ⏳ Delay before voting starts
    function votingDelay() public pure override returns (uint256) {
        return 1;
    }

    // 🗳️ Voting duration
    function votingPeriod() public pure override returns (uint256) {
        return 45818;
    }

    // 🧮 Minimum participation
    function quorum(uint256) public pure override returns (uint256) {
        return 1000 * 10**18;
    }

    // 🪙 Proposal threshold
    function proposalThreshold() public pure override returns (uint256) {
        return 100 * 10**18;
    }

    // 🔥 REQUIRED OVERRIDES

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}