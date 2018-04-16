pragma solidity ^0.4.8;

import "./util/Killable.sol";
import "./PryzeSweepstakes.sol";
import "./PryzeToken.sol";

contract SweepstakesFactory is Killable {
    address[] public sweepstakes;

    uint totalUsedTokens = 0;

    address internal pryzeTokenAddress;

    address constant PAYMENT_TO_ADDRESS = 0x70A5B9f9abEf6154D34B79128081823257A025F3;

    event NewSweepstakesCreated(address addr);

    function SweepstakesFactory(address _pryzeTokenAddress, uint _previouslyUsedTokens) public {
        // Require that factory accepts correct pryze token address
        require(_pryzeTokenAddress == 0x6b834f43B7f5a1644e0C81CaA0246969dA23105e);

        pryzeTokenAddress = _pryzeTokenAddress;
        totalUsedTokens = _previouslyUsedTokens;
    }

    function getSweepstakesCount() public constant
    returns(uint count)
    {
        return sweepstakes.length;
    }

    function getTotalUsedTokens() public constant
    returns(uint tokens)
    {
        return totalUsedTokens;
    }

    function createNewSweepstakes(
        string _name,
        string _sponsorName,
        string _sponsorTermsUrl,
        string _contactInformation,
        string _prizeDescription,
        uint _startTime,
        uint _endTime
    ) public
    returns(address sweepstakesAddress)
    {

        // Only transfer as many tokens as we need for creation, in case more than necessary
        // were approved
        PryzeToken pryzeToken = PryzeToken(pryzeTokenAddress);

        uint creationCost = 3 * (pryzeToken.totalSupply() - totalUsedTokens) / 1000 / 100;


        // Instead of transferring all tokens to this factory, lock 99% somewhere and
        // send the rest to the company
        uint totalForLockup = creationCost * 99 / 100;
        uint totalForCompany = creationCost - totalForLockup; // To avoid rounding errors

        require(pryzeToken.transferFrom(msg.sender, this, totalForLockup));
        require(pryzeToken.transferFrom(msg.sender, PAYMENT_TO_ADDRESS, totalForCompany));

        // Increment totalUsedTokens by the total we are locking up 
        totalUsedTokens += totalForLockup;

        PryzeSweepstakes s = new PryzeSweepstakes(
            msg.sender,
            owner,
            _name,
            _sponsorName,
            _sponsorTermsUrl,
            _contactInformation,
            _prizeDescription,
            _startTime,
            _endTime
        );
        sweepstakes.push(s);
        NewSweepstakesCreated(s);
        return s;
    }

}