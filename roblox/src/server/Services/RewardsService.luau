--[[
	RewardsService — daily reward streak and promo codes.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)

local RewardsService = {}

function RewardsService.ClaimDaily(player: Player): (boolean, string)
	local data = DataService.Get(player)
	if not data then
		return false, "Still loading, try again in a second."
	end
	local now = os.time()
	local since = now - data.DailyLast
	if since < Config.Daily.Cooldown then
		return false, "Next reward in " .. Format.Time(Config.Daily.Cooldown - since)
	end

	local day
	if data.DailyLast == 0 or since > Config.Daily.StreakResetAfter then
		day = 1
	else
		day = data.DailyStreak % #Config.Daily.Minutes + 1
	end

	local amount = EconomyService.IncomeReward(player, Config.Daily.Minutes[day], Config.Daily.MinCash[day])
	data.DailyLast = now
	data.DailyStreak = day
	EconomyService.AddCash(player, amount)
	return true, "Day " .. day .. " reward: +" .. Format.Money(amount)
end

function RewardsService.RedeemCode(player: Player, rawCode: string): (boolean, string)
	local data = DataService.Get(player)
	if not data then
		return false, "Still loading, try again in a second."
	end
	local code = string.upper((string.gsub(rawCode, "%s", "")))
	local reward = Config.Codes[code]
	if not reward then
		return false, "Unknown code."
	end
	if data.Codes[code] then
		return false, "You already used this code."
	end

	local amount = EconomyService.IncomeReward(player, reward.Minutes, reward.Min)
	data.Codes[code] = true
	EconomyService.AddCash(player, amount)
	return true, "Code " .. code .. ": +" .. Format.Money(amount)
end

return RewardsService
