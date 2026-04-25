// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarbonRetirementNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct RetirementInfo {
        uint256 projectId;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => RetirementInfo) public retirementDetails;

    event RetirementNFTMinted(
        uint256 indexed tokenId,
        address indexed user,
        uint256 projectId,
        uint256 amount,
        string metadataURI
    );

    constructor() ERC721("ImpactNFT", "IMPACT") {}

    function mintRetirementNFT(
        address user,
        uint256 projectId,
        uint256 amount,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _mint(user, tokenId);
        _setTokenURI(tokenId, metadataURI);

        retirementDetails[tokenId] = RetirementInfo({
            projectId: projectId,
            amount: amount,
            timestamp: block.timestamp
        });

        emit RetirementNFTMinted(tokenId, user, projectId, amount, metadataURI);
        
        return tokenId;
    }
}
