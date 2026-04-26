// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CarbonAMM {
    IERC20 public token;
    uint256 public reserveETH;
    uint256 public reserveToken;

    event LiquidityAdded(uint256 amountETH, uint256 amountToken);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isETHtoToken);

    constructor(address _token) {
        token = IERC20(_token);
    }

    // Add liquidity (ETH + Tokens)
    function addLiquidity(uint256 tokenAmount) external payable {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must send tokens");

        // Transfer tokens from user to AMM
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        // Update reserves
        reserveETH += msg.value;
        reserveToken += tokenAmount;

        emit LiquidityAdded(msg.value, tokenAmount);
    }

    // Get current price (ETH per 1 full token, scaled to 18 decimals)
    function getPrice() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return (reserveETH * 1e18) / reserveToken;
    }

    // Estimate output amount with 0.3% fee
    function getAmountOut(uint256 amountIn, bool isETHtoToken) public view returns (uint256) {
        if (amountIn == 0) return 0;
        
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        
        if (isETHtoToken) {
            return (amountInWithFee * reserveToken) / (reserveETH + amountInWithFee);
        } else {
            return (amountInWithFee * reserveETH) / (reserveToken + amountInWithFee);
        }
    }

    // Swap ETH for Tokens
    function swapETHForTokens() external payable {
        require(msg.value > 0, "Must send ETH");
        require(reserveETH > 0 && reserveToken > 0, "Insufficient liquidity");

        uint256 ethIn = msg.value;
        uint256 tokensOut = getAmountOut(ethIn, true);

        require(tokensOut > 0, "Insufficient output amount");
        require(tokensOut <= reserveToken, "Not enough tokens in reserve");

        // Update reserves
        reserveETH += ethIn;
        reserveToken -= tokensOut;

        // Send tokens to user
        require(token.transfer(msg.sender, tokensOut), "Token transfer failed");

        emit Swap(msg.sender, ethIn, tokensOut, true);
    }

    // Swap Tokens for ETH
    function swapTokensForETH(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Must send tokens");
        require(reserveETH > 0 && reserveToken > 0, "Insufficient liquidity");

        uint256 ethOut = getAmountOut(tokenAmount, false);

        require(ethOut > 0, "Insufficient output amount");
        require(ethOut <= reserveETH, "Not enough ETH in reserve");

        // Transfer tokens from user to AMM
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        // Update reserves
        reserveToken += tokenAmount;
        reserveETH -= ethOut;

        // Send ETH to user
        payable(msg.sender).transfer(ethOut);

        emit Swap(msg.sender, tokenAmount, ethOut, false);
    }

    // Helper to get reserves
    function getReserves() external view returns (uint256, uint256) {
        return (reserveETH, reserveToken);
    }

    // Fallback to receive ETH
    receive() external payable {}
}
