pragma solidity ^0.4.8;

import "./util/WithoutDefaultFunction.sol";

contract PryzeSweepstakes {
    string public name;
    string public sponsorName;
    string public sponsorTermsUrl;
    string public contactInformation;
    string public prizeDescription;
    address public sponsor;
    address public factoryOwner;

    uint public startTime;
    uint public endTime;

    uint public winnerIndex;

    bool isActive = false;

    bytes32 hashOfEntries;
    uint public totalEntries;

    // save reject reason for entrant at index
    mapping(uint => bytes32) public rejectReasons;
    string public winnerTransactionHash;

    // Events
    event DecidedWinner(address addr, uint winnerIndex);
    event AcceptedWinner(address addr, uint winnerIndex, string transactionHash);
    event RejectedWinner(address addr, uint rejectedWinnerEntryIndex, bytes32 rejectReason);

    modifier sponsorOnly {
        require(msg.sender == sponsor);
        _;
    }

    modifier pryzeOnly {
        require(msg.sender == factoryOwner);
        _;
    }

    modifier pryzeOrSponsorOnly {
        require(msg.sender == sponsor || msg.sender == factoryOwner);
        _;
    }

    function PryzeSweepstakes(
        address _sponsor,
        address _factoryOwner,
        string _name,
        string _sponsorName,
        string _sponsorTermsUrl,
        string _contactInformation,
        string _prizeDescription,
        uint _startTime,
        uint _endTime
    ) public {

        sponsor = _sponsor;
        factoryOwner = _factoryOwner;
        name = _name;
        sponsorName = _sponsorName;
        sponsorTermsUrl = _sponsorTermsUrl;
        contactInformation = _contactInformation;
        prizeDescription = _prizeDescription;
        startTime = _startTime;
        endTime = _endTime;
        isActive = true;
    }

    function getName() public constant returns (string) {
        return name;
    }

    function getSponsorName() public constant returns (string) {
        return sponsorName;
    }

    function getSponsorTermsUrl() public constant returns (string) {
        return sponsorTermsUrl;
    }

    function getContactInformation() public constant returns (string) {
        return contactInformation;
    }

    function getPrizeDescription() public constant returns (string) {
        return prizeDescription;
    }

    function getStartTime() public constant returns (uint) {
        return startTime;
    }

    function getEndTime() public constant returns (uint) {
        return endTime;
    }

    function getWinnerIndex() public constant returns (uint) {
        return winnerIndex;
    }

    function getTotalEntries() public constant returns (uint) {
        return totalEntries;
    }


    // Used for state machine for right after data has been set and winner should be selected
    bool public shouldDecideWinner = false;

    // Used for state machine after winner has been picked, and sponsor can decide to accept or reject
    // based on terms
    bool public shouldAcceptOrRejectWinner = false;

    // Final state when
    bool public acceptedWinner = false;

    // Number entries from the sidechain, and other sidechain information used for randomization and verification
    uint numberEntries;
    bytes32 blockHashOfSideChain;
    uint blockNumberOfSideChain;
    uint timestampOfSideChain;

    // Block number that winner pick data is set
    uint winnerSetDataBlockNumber;

    // Entry index for winner
    uint public lastRejectedWinnerEntryIndex;

    // Entry index for winner
    uint winnerEntryIndex;

    function setWinnerPickData(uint _numberEntries, bytes32 _blockHashOfSideChain, uint _blockNumberOfSideChain, uint _timestampOfSideChain) public pryzeOnly {
        require(!shouldDecideWinner);

        numberEntries = _numberEntries;
        blockHashOfSideChain = _blockHashOfSideChain;
        blockNumberOfSideChain = _blockNumberOfSideChain;
        timestampOfSideChain = _timestampOfSideChain;
        winnerSetDataBlockNumber = block.number;

        shouldDecideWinner = true;
    }

    function decideWinner() public pryzeOrSponsorOnly returns(uint) {
        // Don't let winner be picked if we're the same block as creation because this value is known before the
        // contract and this function could be called together
        require(block.number > winnerSetDataBlockNumber);

        // Make sure we're ready to decide a winner
        require(shouldDecideWinner && !shouldAcceptOrRejectWinner);

        uint limit = numberEntries;
        winnerEntryIndex = uint(sha3(
                block.blockhash(block.number - 1),
                blockHashOfSideChain,
                blockNumberOfSideChain,
                timestampOfSideChain)) % limit;

        shouldAcceptOrRejectWinner = true;

        DecidedWinner(this, winnerEntryIndex);
        return winnerEntryIndex;
    }

    function rejectWinner(bytes32 reason) sponsorOnly {
        require(shouldAcceptOrRejectWinner && !acceptedWinner);

        shouldAcceptOrRejectWinner = false;
        lastRejectedWinnerEntryIndex = winnerEntryIndex;
        winnerEntryIndex = 0;

        // save the reject reason
        rejectReasons[lastRejectedWinnerEntryIndex] = reason;

        RejectedWinner(this, lastRejectedWinnerEntryIndex, reason);
        decideWinner();
    }

    function getRejectReasonForIndex (uint index) public returns (bytes32) {
        return rejectReasons[index];
    }

    function acceptWinner() sponsorOnly {
        require(shouldAcceptOrRejectWinner && !acceptedWinner);
        acceptedWinner = true;

        AcceptedWinner(this, winnerEntryIndex, "");
    }

    // Note: transactionHash is of type string to allow flexibility
    //       for not-ethereum hashes (e.g. bitcoin)
    function acceptWinner(string transactionHash) sponsorOnly {
        require(shouldAcceptOrRejectWinner && !acceptedWinner);
        acceptedWinner = true;

        winnerTransactionHash = transactionHash;

        AcceptedWinner(this, winnerEntryIndex, winnerTransactionHash);
    }

    function getWinnerEntryIndex() public returns(uint) {
        return winnerEntryIndex;
    }
}
