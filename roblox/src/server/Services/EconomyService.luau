--[[
	EconomyService — cash, multipliers, income and what the player sees
	(player attributes + leaderstats).

	All money changes go through here, and only on the server.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local DataService = require(script.Parent.DataService)

local EconomyService = {}

local passes: { [Player]: { [string]: boolean } } = {}

------------------------------------------------------------------------
-- Game pass flags (set by MonetizationService)
------------------------------------------------------------------------

function EconomyService.HasPass(player: Player, passName: string): boolean
	local owned = passes[player]
	return owned ~= nil and owned[passName] == true
end

function EconomyService.SetPass(player: Player, passName: string, owned: boolean)
	passes[player] = passes[player] or {}
	passes[player][passName] = owned
	player:SetAttribute("Pass_" .. passName, owned)
	if passName == "AutoCollect" and owned then
		EconomyService.CollectBank(player)
	end
	EconomyService.Sync(player)
end

------------------------------------------------------------------------
-- Multipliers and income
------------------------------------------------------------------------

function EconomyService.IsBoosted(player: Player): boolean
	local data = DataService.Get(player)
	return data ~= nil and data.BoostEndsAt > os.time()
end

function EconomyService.GetMultiplier(player: Player): number
	local data = DataService.Get(player)
	if not data then
		return 1
	end
	local multiplier = Config.RebirthMultiplier(data.Rebirths)
	if EconomyService.HasPass(player, "DoubleCash") then
		multiplier *= Config.Multipliers.DoubleCash
	end
	if EconomyService.HasPass(player, "VIP") then
		multiplier *= Config.Multipliers.VIP
	end
	if player.MembershipType == Enum.MembershipType.Premium then
		multiplier *= Config.Multipliers.Premium
	end
	if data.BoostEndsAt > os.time() then
		multiplier *= Config.Multipliers.Boost
	end
	return multiplier
end

function EconomyService.GetMachineSpeed(player: Player): number
	if EconomyService.HasPass(player, "TurboDroppers") then
		return Config.Multipliers.TurboSpeed
	end
	return 1
end

-- Income per second from the items a player owns (before multipliers).
local function baseIncome(owned: { [string]: boolean }, machineSpeed: number): number
	local dropPerSecond = 0
	local upgrade = 1
	local passive = 0
	for _, item in Config.Items do
		if owned[item.Id] then
			if item.Kind == "Dropper" then
				dropPerSecond += item.Value / item.Interval
			elseif item.Kind == "Upgrader" then
				upgrade *= item.Mult
			elseif item.Kind == "Showroom" then
				passive += item.PerSecond
			end
		end
	end
	return dropPerSecond * machineSpeed * upgrade + passive
end

function EconomyService.GetIncomePerSecond(player: Player): number
	local data = DataService.Get(player)
	if not data then
		return 0
	end
	return baseIncome(data.Owned, EconomyService.GetMachineSpeed(player)) * EconomyService.GetMultiplier(player)
end

-- "N minutes of income, but at least Min" — used by cash packs, codes and daily rewards.
function EconomyService.IncomeReward(player: Player, minutes: number, minimum: number): number
	local amount = EconomyService.GetIncomePerSecond(player) * 60 * minutes
	return math.floor(math.max(minimum, amount))
end

------------------------------------------------------------------------
-- Money
------------------------------------------------------------------------

function EconomyService.AddCash(player: Player, amount: number)
	local data = DataService.Get(player)
	if not data or amount ~= amount or amount <= 0 then
		return
	end
	data.Cash += amount
	data.TotalEarned += amount
	EconomyService.Sync(player)
end

-- Money from sold parts and the showroom goes to the plot's bank first
-- (or straight to the wallet with Auto Collect).
function EconomyService.AddToBank(player: Player, amount: number)
	local data = DataService.Get(player)
	if not data or amount ~= amount or amount <= 0 then
		return
	end
	if EconomyService.HasPass(player, "AutoCollect") then
		EconomyService.AddCash(player, amount)
		return
	end
	data.Bank += amount
	EconomyService.Sync(player)
end

function EconomyService.CollectBank(player: Player): number
	local data = DataService.Get(player)
	if not data or data.Bank <= 0 then
		return 0
	end
	local amount = data.Bank
	data.Bank = 0
	EconomyService.AddCash(player, amount)
	return amount
end

function EconomyService.TrySpend(player: Player, amount: number): boolean
	local data = DataService.Get(player)
	if not data then
		return false
	end
	if amount <= 0 then
		return true
	end
	if data.Cash < amount then
		return false
	end
	data.Cash -= amount
	EconomyService.Sync(player)
	return true
end

------------------------------------------------------------------------
-- What the client sees
------------------------------------------------------------------------

local function setupLeaderstats(player: Player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"

	local cash = Instance.new("StringValue")
	cash.Name = "Cash"
	cash.Value = "$0"
	cash.Parent = leaderstats

	local rebirths = Instance.new("IntValue")
	rebirths.Name = "Rebirths"
	rebirths.Parent = leaderstats

	leaderstats.Parent = player
end

function EconomyService.Sync(player: Player)
	local data = DataService.Get(player)
	if not data then
		return
	end
	player:SetAttribute("Cash", data.Cash)
	player:SetAttribute("Bank", data.Bank)
	player:SetAttribute("Rebirths", data.Rebirths)
	player:SetAttribute("Multiplier", EconomyService.GetMultiplier(player))
	player:SetAttribute("IncomePerSec", EconomyService.GetIncomePerSecond(player))
	player:SetAttribute("BoostEndsAt", data.BoostEndsAt)
	player:SetAttribute("DailyLast", data.DailyLast)
	player:SetAttribute("DailyStreak", data.DailyStreak)

	local leaderstats = player:FindFirstChild("leaderstats")
	if leaderstats then
		local cash = leaderstats:FindFirstChild("Cash") :: StringValue?
		local rebirths = leaderstats:FindFirstChild("Rebirths") :: IntValue?
		if cash then
			cash.Value = Format.Money(data.Cash)
		end
		if rebirths then
			rebirths.Value = data.Rebirths
		end
	end
end

function EconomyService.Start()
	DataService.OnLoaded(function(player)
		if not player:FindFirstChild("leaderstats") then
			setupLeaderstats(player)
		end
		EconomyService.Sync(player)
	end)

	Players.PlayerRemoving:Connect(function(player)
		passes[player] = nil
	end)

	-- Premium status can change mid-session
	Players.PlayerMembershipStatusChanged:Connect(function(player)
		EconomyService.Sync(player)
	end)

	-- refresh multipliers once a second (boost timers run out, etc.)
	task.spawn(function()
		while true do
			task.wait(1)
			for _, player in Players:GetPlayers() do
				EconomyService.Sync(player)
			end
		end
	end)
end

return EconomyService
