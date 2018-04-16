/*
Many contracts don't make sense to provide a default payable function, so we'll revert in that case.
.*/
pragma solidity ^0.4.11;

contract WithoutDefaultFunction {
    function() external payable {
        revert();
    }
}