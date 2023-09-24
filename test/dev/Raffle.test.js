const { assert, expect } = require("chai")

const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { network, ethers, getNamedAccounts, deployments } = require("hardhat")
const { BigNumber } = require("@ethersproject/bignumber")

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Raffle Unit Tests", async function () {
			let raffle, vrfCoordinatorV2, entranceFee, deployer
			beforeEach(async function () {
				deployer = (await getNamedAccounts()).deployer
				await deployments.fixture(["all"])
				raffle = await ethers.getContract("Raffle", deployer)
				vrfCoordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
			})

			describe("constructor", async function () {
				it("Raffle state is open", async function () {
					const expectedState = await raffle.getRaffleState()
					assert.equal(expectedState.toString(), "0")
				})

				it("Initial entrance fee", async function () {
					entranceFee = await raffle.getEntranceFee()
					const expectedEntranceFee = ethers.parseEther("0.01").toString()
					assert.equal(entranceFee.toString(), expectedEntranceFee)
				})

				it("Initial Gas Line Fee", async function () {
					const gasLine = await raffle.getGasLine()
					const expectedGasLine = networkConfig[network.config.chainId]["gasLane"]
					assert.equal(gasLine, expectedGasLine)
				})
			})

			describe("EnterRaffle", async function () {
				it("revert with not enough ether", async function () {
					await expect(raffle.enterRaffle()).to.be.reverted
				})

				it("player added succesfully", async function () {
					await raffle.enterRaffle({ value: entranceFee })
					const firstPlayer = await raffle.getPlayer(0)
					assert.equal(firstPlayer, deployer)
				})
			})

			describe("Pick Winner", function () {
				let raffle, raffleEntrenceFee, interval, VRFCoordinatorV2Mock
				beforeEach(async function () {
					raffle = await ethers.getContract("Raffle")
					VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
					raffleEntrenceFee = await raffle.getEntranceFee()
					interval = await raffle.getInterval()
				})

				it("Get the winner", async function () {
					const accounts = await ethers.getSigners()
					const startingIndex = 1 // deployer is 0
					for (let i = startingIndex; i < accounts.length; i++) {
						await raffle.connect(accounts[i]).enterRaffle({ value: raffleEntrenceFee })
					}
					const winnerStartingBalance = await ethers.provider.getBalance(
						accounts[1].address,
					)
					await network.provider.send("evm_increaseTime", [ethers.toNumber(interval) + 1])
					await network.provider.send("evm_mine", [])

					await new Promise(async (resolve, reject) => {
						raffle.once("WinnerPicked", async function () {
							try {
								const playersCount = await raffle.getNumberOfPlayers()
								const raffleState = await raffle.getRaffleState()
								const recentWinner = await raffle.getRecentWinner()
								const winnerEndingBalance = await ethers.provider.getBalance(
									accounts[1].address,
								)
								assert.equal(raffleState.toString(), "0")
								assert.equal(ethers.toNumber(playersCount), 0)
								assert.equal(
									recentWinner.toString(),
									(await accounts[1].getAddress()).toString(),
								)
								assert.equal(
									winnerEndingBalance.toString(),
									(
										winnerStartingBalance +
										BigInt(accounts.length - 1) * raffleEntrenceFee
									).toString(),
								)
								resolve()
							} catch (e) {
								console.log(e)
								reject(e)
							}
						})
						const tx = await raffle.performUpkeep("0x")
						const txReceipt = await tx.wait()
						VRFCoordinatorV2Mock.fulfillRandomWords(
							txReceipt.logs[1].args[0],
							raffle.getAddress(),
						)
					})
				})
			})
	  })
