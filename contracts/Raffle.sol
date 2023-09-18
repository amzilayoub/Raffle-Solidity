// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NOTEnoughETHError();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint256 balance, uint256 playersCount, uint256 raffleState);

/*
 * @title sample Raffle Contract
 * @author Amzil Ayoub
 * @notice this contract is for creating a decentralized smart contract for lottery purpose
 * @dev this implements Chainlink VRF v2 and Chaninlink Keepers
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Types */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

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
    RaffleState private s_raffleState;
    uint256 private immutable i_interval;
    uint256 private s_lastBlockTimestamp;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequrestedRaffleWinner(uint256 indexed requrestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    /*
     * @param vrfCoordinator: is the address of the contract that does the random number verification
     */
    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLine, // The limit for how much gas to use for the callback request to your contract's fulfillRandomWords function
        uint256 entranceFree, //The gas lane key hash value, which is the maximum gas price you are willing to pay for a request in wei
        uint64 subscriptionId,
        uint32 callbackGasLimit, // Specifies the maximum amount of gas you are willing to spend on the callback request
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFree;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLine = gasLine;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = interval;
        s_lastBlockTimestamp = block.timestamp;
    }

    function enterRaffle(uint256 value) public payable {
        if (s_raffleState != RaffleState.OPEN) revert Raffle__NotOpen();
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
        s_raffleState = RaffleState.OPEN;
        s_lastBlockTimestamp = block.timestamp;
        if (!success) revert Raffle__TransferFailed();
        s_players = new address payable[](0);
        emit WinnerPicked(s_recentWinner);
    }

    /*
     * @dev
     * check if:
     * 1- we have balanace
     * 2- there is at least one player
     * 3- time interval should have passed
     * 4-lottery is open
     * 5- out subscription is funded with link
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool hasBalance = (address(this).balance > 0);
        bool hasPlayers = (s_players.length > 0);
        bool intervalPassed = (block.timestamp - s_lastBlockTimestamp) > i_interval;
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        upkeepNeeded = (hasBalance && hasPlayers && intervalPassed && isOpen);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded)
            revert Raffle__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        s_raffleState = RaffleState.CALCULATING;
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

    function getRaffleState() public view returns (RaffleState) {
        return (s_raffleState);
    }
}
