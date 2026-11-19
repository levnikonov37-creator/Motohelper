--[[
	MonetizationService — Game Passes and Developer Products.

	Developer Product purchases follow Roblox's rules for ProcessReceipt:
	the reward and the receipt id are saved together, and we only answer
	PurchaseGranted after the save reached the DataStore. If anything fails we
	answer NotProcessedYet and Roblox retries later (no lost or doubled rewards).
]]

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local Net = require(script.Parent.Net)

local MonetizationService = {}

local passNameById: { [number]: string } = {}
for name, pass in Config.GamePasses do
	if pass.Id ~= 0 then
		passNameById[pass.Id] = name
	end
end

local productById: { [number]: any } = {}
for _, product in Config.Products do
	if product.Id ~= 0 then
		productById[product.Id] = product
	end
end

local function ownsPass(player: Player, passId: number): boolean
	for attempt = 1, 3 do
		local ok, result = pcall(function()
			return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
		end)
		if ok then
			return result
		end
		task.wait(attempt)
	end
	return false
end

local function checkPasses(player: Player)
	for name, pass in Config.GamePasses do
		if pass.Id ~= 0 then
			task.spawn(function()
				if ownsPass(player, pass.Id) and player.Parent then
					EconomyService.SetPass(player, name, true)
				end
			end)
		end
	end
end

-- Gives the reward for one Developer Product. Returns a message for the player.
local function grantProduct(player: Player, product: any, data: any): string
	if product.Kind == "Cash" then
		local amount = EconomyService.IncomeReward(player, product.Minutes, product.Min)
		EconomyService.AddCash(player, amount)
		return "+" .. Format.Money(amount) .. " — thanks for the support!"
	elseif product.Kind == "Boost" then
		data.BoostEndsAt = math.max(os.time(), data.BoostEndsAt) + product.Seconds
		EconomyService.Sync(player)
		return "2x Boost active for " .. Format.Time(data.BoostEndsAt - os.time()) .. "!"
	end
	error("unknown product kind " .. tostring(product.Kind))
end

local function processReceipt(receipt)
	local product = productById[receipt.ProductId]
	if not product then
		warn("[Monetization] unknown product id " .. tostring(receipt.ProductId) .. " — add it to Config.Products")
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	if not player then
		return Enum.ProductPurchaseDecision.NotProcessedYet -- granted next time they join
	end
	local data = DataService.WaitForData(player, 20)
	if not data then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	if not DataService.HasPurchase(data, receipt.PurchaseId) then
		local ok, message = pcall(grantProduct, player, product, data)
		if not ok then
			warn("[Monetization] failed to grant: " .. tostring(message))
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		DataService.RecordPurchase(data, receipt.PurchaseId)
		Net.Notify(player, "Reward", { Text = message })
	end

	if DataService.Save(player) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end
	return Enum.ProductPurchaseDecision.NotProcessedYet
end

function MonetizationService.Start()
	Players.PlayerAdded:Connect(checkPasses)
	for _, player in Players:GetPlayers() do
		task.spawn(checkPasses, player)
	end

	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		local name = passNameById[passId]
		if purchased and name then
			EconomyService.SetPass(player, name, true)
			Net.Notify(player, "Reward", { Text = Config.GamePasses[name].Name .. " unlocked — thank you!" })
		end
	end)

	MarketplaceService.ProcessReceipt = processReceipt
end

return MonetizationService
