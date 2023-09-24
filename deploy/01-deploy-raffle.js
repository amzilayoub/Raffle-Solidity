const { network, ethers } = require("hardhat")
require("dotenv").config()
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()
	const targetedNetworkConfig = networkConfig[network.config.chainId]
	let vrfCoordinatorV2Address,
		entranceFee,
		gasLane,
		subscriptionId,
		callbackGasLimit,
		interval,
		vrfCoordinatorV2Mock

	if (developmentChains.includes(network.name)) {
		vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
		vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
		const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
		const transactionReceipt = await transactionResponse.wait()

		subscriptionId = transactionReceipt.logs[0].args[0]
		entranceFee = targetedNetworkConfig.entranceFee
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
		callbackGasLimit = targetedNetworkConfig.callbackGasLimit
		interval = targetedNetworkConfig.interval
		gasLane = targetedNetworkConfig.gasLane
	} else {
		vrfCoordinatorV2Address = targetedNetworkConfig["vrfCoordinatorV2"]
		gasLane = targetedNetworkConfig.gasLane
		entranceFee = targetedNetworkConfig.entranceFee
		subscriptionId = targetedNetworkConfig.subscriptionId
		callbackGasLimit = targetedNetworkConfig.callbackGasLimit
		interval = targetedNetworkConfig.interval
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

	// await vrfCoordinatorV2Mock.addConsumer(ethers.toNumber(subscriptionId), raffle.address)

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		log("Verifying...")
		await verify(raffle.address, args)
	}
	log("-------------------------------")
}

module.exports.tags = ["all", "raffle"]
