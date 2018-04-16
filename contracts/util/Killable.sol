pragma solidity ^0.4.4;


import "./Owned.sol";


/*
 * Killable
 * Base contract that can be killed by owner. All funds in contract will be sent to the owner.
 */
contract Killable is Owned {

 function kill() ownerOnly {
  selfdestruct(owner);
 }
}