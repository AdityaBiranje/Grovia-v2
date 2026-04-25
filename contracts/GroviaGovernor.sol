// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";

contract GroviaGovernor is
    Governor,
    GovernorVotes,
    GovernorCountingSimple
{
    constructor(IVotes _token)
        Governor("GroviaGovernor")
        GovernorVotes(_token)
    {}

    // ⏳ Delay before voting starts (in blocks)
    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    // 🗳️ Voting duration
    function votingPeriod() public pure override returns (uint256) {
        return 45818; // ~1 week
    }

    // 🧮 Minimum votes required
    function quorum(uint256) public pure override returns (uint256) {
        return 1000 * 10**18;
    }

    // 🪙 Minimum tokens to create proposal
    function proposalThreshold() public pure override returns (uint256) {
        return 100 * 10**18;
    }
}