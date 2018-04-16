/*
Sweepstakes that runs on the sidechain and only accepts PryzeSilverToken for entries.
.*/
pragma solidity ^0.4.8;

import "./PryzeSilverToken.sol";


contract SweepstakesEntries {
    address pryzeSilverTokenAddress;

    // Friendly name of sweeps
    string name;

    struct Entry {
        bytes32 entryEmailHash;
        address entrantAddressWallet;
    }

    mapping(uint => Entry[]) allSweepstakesEntries;

    event EntryAdded(address entrantAddress, uint256 entrantIndex);

    function SweepstakesEntries(address _pryzeSilverTokenAddress) {
        pryzeSilverTokenAddress = _pryzeSilverTokenAddress;
    }

    function getEntrantWalletAddress(uint sweepstakesId, uint256 index) constant returns (address) {
        return allSweepstakesEntries[sweepstakesId][index].entrantAddressWallet;
    }

    function getEntrantEmailHash(uint sweepstakesId, uint256 index) returns (bytes32) {
        return allSweepstakesEntries[sweepstakesId][index].entryEmailHash;
    }

    function addEntrant(uint _sweepstakesId, bytes32 _emailHash, address _entrantAddressWallet) {

        PryzeSilverToken pryzeSilverToken = PryzeSilverToken(pryzeSilverTokenAddress);
        require(pryzeSilverToken.transferFrom(msg.sender, this, 1));

        allSweepstakesEntries[_sweepstakesId].push(Entry(_emailHash, _entrantAddressWallet));
    }

    function getTotalNumberEntries(uint _sweepstakesId) returns (uint) {
        return allSweepstakesEntries[_sweepstakesId].length;
    }
}
