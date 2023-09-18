const { network, ethers } = require("hardhat")
require("dotenv").config()
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../helper-hardhat-config")
const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    let vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, callbackGasLimit, interval

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()

        subscriptionId = transactionReceipt.logs[0].args[0]
        entranceFee = networkConfig[network.config.chainId].entranceFee
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
        callbackGasLimit = networkConfig[network.config.chainId].callbackGasLimit
        interval = networkConfig[network.config.chainId].interval
        gasLane = networkConfig[network.config.chainId].gasLane
    } else {
        vrfCoordinatorV2Address = networkConfig[network.config.chainId]["vrfCoordinatorV2"]
        gasLane = networkConfig[network.config.chainId].gasLane
        entranceFee = networkConfig[network.config.chainId].entranceFee
        subscriptionId = networkConfig[network.config.chainId].subscriptionId
        callbackGasLimit = networkConfig[network.config.chainId].callbackGasLimit
        interval = networkConfig[network.config.chainId].interval
    }
    args = [
        vrfCoordinatorV2Address,
        gasLane,
        entranceFee,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API) {
        log("Verifying...")
        await verify(raffle.address, args)
    }
    log("-------------------------------")
}

module.exports.tags = ["all", "raffle"]
