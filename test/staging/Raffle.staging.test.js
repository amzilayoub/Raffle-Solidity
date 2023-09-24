const { network, getNamedAccounts, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
	? describe.skip
	: describe("Staging tests", function () {
			let raffle, raffleEntranceFee, accounts
			this.beforeEach(async function () {
				accounts = await ethers.getSigners()
				raffle = await ethers.getContract("Raffle")
				console.log("Raffle Address = ", await raffle.getAddress())
				raffleEntranceFee = await raffle.getEntranceFee()
			})
			it("Enter raffle", async function () {
				await new Promise(async (resolve, reject) => {
					raffle.once("WinnerPicked", async function () {
						try {
							const playersCount = await raffle.getNumberOfPlayers()
							const raffleState = await raffle.getRaffleState()
							const recentWinner = await raffle.getRecentWinner()
							assert.equal(
								(await accounts[0].getAddress()).toString(),
								recentWinner.toString(),
							)
							assert.equal(raffleState.toString(), "0")
							assert.equal(playersCount.toString(), "0")
							resolve()
						} catch (e) {
							console.log(e)
							reject(e)
						}
					})
					raffle.connect(accounts[0]).enterRaffle({ value: raffleEntranceFee })
				})
			})
	  })
