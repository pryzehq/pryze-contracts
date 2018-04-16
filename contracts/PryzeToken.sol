/*
Implements ERC 20 Token standard: https://github.com/ethereum/EIPs/issues/20
.*/
pragma solidity ^0.4.8;

import "./ERC20Token.sol";


// NOTE: This token contract is used only for testing, actual PryzeToken contract in other
// repo.
contract PryzeToken is ERC20Token {

    // Fancy name: eg Simon Bucks
    string public constant name = "Pryze Gold Tokens";

    // How many decimals to show. ie. There could 1000 base units with 3 decimals.
    // Meaning 0.980 SBX = 980 base units. It's like comparing 1 wei to 1 ether.
    uint8 public constant decimals = 1;

    // An identifier: eg SBX
    string public constant symbol = "PRYZ";

    // Human 0.1 standard. Just an arbitrary versioning scheme.
    string public constant version = 'H0.1';

    uint constant public TOKEN_COST_PER_SWEEPSTAKES = 1;

    function PryzeToken(
        uint256 _initialAmount
    ) ERC20Token(_initialAmount) {

    }
}
