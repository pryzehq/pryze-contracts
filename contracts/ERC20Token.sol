/*
Implements ERC 20 Token standard: https://github.com/ethereum/EIPs/issues/20
.*/
pragma solidity ^0.4.8;

import "./Token.sol";

contract ERC20Token is Token {

    // Balances by owner address
    mapping (address => uint256) balances;

    // Allowances keyed by owner to sender to amount 
    mapping (address => mapping (address => uint256)) allowed;

    event Burned(address indexed _owner, uint256 _value);

    function ERC20Token(
        uint256 _initialAmount
    ) {
        balances[msg.sender] = _initialAmount;
        totalSupply = _initialAmount;
    }

    function transfer(address _to, uint256 _value) returns (bool success) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
        require(balances[_from] >= _value && allowed[_from][msg.sender] >= _value);
        balances[_to] += _value;
        balances[_from] -= _value;
        allowed[_from][msg.sender] -= _value;
        Transfer(_from, _to, _value);
        return true;
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) returns (bool success) {
        // Approve _spender to transfer tokens from us
        // Note that this function (and other approve functions) are idempotent,
        // they are NOT additive!
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    function burn(uint256 _value) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;

        Burned(msg.sender, _value);
    }
}
