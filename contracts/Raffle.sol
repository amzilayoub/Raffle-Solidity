// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error Raffle__NOTEnoughETHError();
error Raffle__TransferFailed();

contract Raffle is VRFConsumerBaseV2 {
    /* Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLine;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private s_recentWinner;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequrestedRaffleWinner(uint256 indexed requrestId);
    event WinnerPicked(address indexed winner);

    /*
     ** @param vrfCoordinator: is the address of the contract that does the random number verification
     */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFree,
        bytes32 gasLine,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFree;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLine = gasLine;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterRaffle(uint256 value) public payable {
        if (value < i_entranceFee) {
            revert Raffle__NOTEnoughETHError();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        s_recentWinner = s_players[indexOfWinner];

        (bool success, ) = payable(s_recentWinner).call{value: address(this).balance}("");
        if (!success) revert Raffle__TransferFailed();
        emit WinnerPicked(s_recentWinner);
    }

    function requrestRandomWinner() external {
        uint256 requrestId = i_vrfCoordinator.requestRandomWords(
            i_gasLine,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequrestedRaffleWinner(requrestId);
    }

    /* Getters */
    function getEntranceFee() public view returns (uint256) {
        return (i_entranceFee);
    }

    function getgPlayer(uint256 index) public view returns (address) {
        return (s_players[index]);
    }

    function getRecentWinner() public view returns (address) {
        return (s_recentWinner);
    }
}
