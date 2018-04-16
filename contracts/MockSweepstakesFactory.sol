pragma solidity ^0.4.8;

import "./SweepstakesFactory.sol";

contract MockSweepstakesFactory is SweepstakesFactory {

    // Call base constructor with correct address but then allow overwrite for tests
    function MockSweepstakesFactory(address _pryzeTokenAddress, uint _previouslyUsedTokens) public SweepstakesFactory(0x6b834f43B7f5a1644e0C81CaA0246969dA23105e, _previouslyUsedTokens) {
        pryzeTokenAddress = _pryzeTokenAddress;
    }

}