// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarbonToken is ERC20Votes, Ownable {
    mapping(uint256 => string) public metadataHash;
    uint256 public nextProjectId = 1;

    event ProjectMinted(
        uint256 indexed projectId,
        address indexed issuer,
        uint256 amount,
        string metadata
    );

    constructor()
        ERC20("CarbonToken", "CTK")
        ERC20Permit("CarbonToken")
    {
        _mint(msg.sender, 1000000 * 10**18);
    }

    // 🔥 Simple mint for DAO setup
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // 🌱 Project-based mint
    function mintForProject(
        address to,
        uint256 amount,
        string calldata ipfsHash
    ) external onlyOwner returns (uint256) {
        uint256 projectId = nextProjectId++;

        _mint(to, amount);
        metadataHash[projectId] = ipfsHash;

        emit ProjectMinted(projectId, to, amount, ipfsHash);

        return projectId;
    }

    // 🔥 Burn (retire credits)
    function retire(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // =========================
    // REQUIRED OVERRIDES (OZ v4)
    // =========================

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20Votes)
    {
        super._burn(account, amount);
    }
}