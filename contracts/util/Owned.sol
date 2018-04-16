pragma solidity ^0.4.11;

contract Owned {
    // Current owner of contract
    address public owner;

    // Delegated new owner (needs to accept before transfer complete)
    address public newOwner;

    event OwnerUpdate(address _prevOwner, address _newOwner);

    function Owned() {
        owner = msg.sender;
    }

    modifier ownerOnly {
        require(msg.sender == owner);
        _;
    }

    function beginTransferOwnership(address _newOwner) public ownerOnly {
        require(_newOwner != owner);
        newOwner = _newOwner;
    }

    function acceptOwnership() public {
        require(msg.sender == newOwner);
        OwnerUpdate(owner, newOwner);
        owner = newOwner;
        newOwner = 0x0;
    }

    function transferOwnershipWithoutAccept(address _newOwner) public ownerOnly {
        require(_newOwner != owner);
        owner = _newOwner;
    }
}