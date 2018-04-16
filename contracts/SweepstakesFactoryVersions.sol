pragma solidity ^0.4.8;

import "./util/Owned.sol";

contract SweepstakesFactoryVersions is Owned {

    address public addressOfLastVersion;
    address[] public addresses;

    struct VersionInfo {
        string versionName; /* e.g. 'v1.2.3' */
        string description;
    }

    mapping(address => VersionInfo) versionInfo;

    function publishNewVersion(
        address _address,
        string _version,
        string _description
    ) public ownerOnly
    {
        addressOfLastVersion = _address;
        addresses.push(_address);
        versionInfo[_address] = VersionInfo(_version, _description);
    }

    function getVersionName(address index)  public constant returns (string) {
        return versionInfo[index].versionName;
    }
    function getVersionDescription(address index)  public constant returns (string) {
        return versionInfo[index].description;
    }
    function getAddressOfLastVersion() public constant returns (address) {
        return addressOfLastVersion;
    }
    function getVersionsCount() public constant returns(uint count)
    {
        return addresses.length;
    }
    function getAddressOfIndex(uint index) public constant returns(address versionAddress)
    {
        require(index < addresses.length);
        return addresses[index];
    }
}