--[[
	Moto Empire Tycoon — server entry point.
	Starts every service in order and answers the client's remote calls.
]]

local Services = script.Parent.Services

local DataService = require(Services.DataService)
local EconomyService = require(Services.EconomyService)
local LeaderboardService = require(Services.LeaderboardService)
local MonetizationService = require(Services.MonetizationService)
local Net = require(Services.Net)
local RewardsService = require(Services.RewardsService)
local TycoonService = require(Services.TycoonService)
local WorldBuilder = require(Services.WorldBuilder)

local plotsFolder, leaderboardList = WorldBuilder.Build()

-- Order matters: plots must exist before players load, and the receipt
-- handler must be set as early as possible.
EconomyService.Start()
TycoonService.Start(plotsFolder)
MonetizationService.Start()
DataService.Start()
LeaderboardService.Start(leaderboardList)

local Remotes = Net.Remotes

local function result(ok: boolean, message: string)
	return { ok = ok, message = message }
end

local RebirthRemote = Remotes:WaitForChild("Rebirth") :: RemoteFunction
local ClaimDailyRemote = Remotes:WaitForChild("ClaimDaily") :: RemoteFunction
local RedeemCodeRemote = Remotes:WaitForChild("RedeemCode") :: RemoteFunction

RebirthRemote.OnServerInvoke = function(player)
	if Net.RateLimited(player, "rebirth", 1) then
		return result(false, "Slow down!")
	end
	return result(TycoonService.Rebirth(player))
end

ClaimDailyRemote.OnServerInvoke = function(player)
	if Net.RateLimited(player, "daily", 1) then
		return result(false, "Slow down!")
	end
	return result(RewardsService.ClaimDaily(player))
end

RedeemCodeRemote.OnServerInvoke = function(player, code)
	if typeof(code) ~= "string" or #code > 40 then
		return result(false, "Unknown code.")
	end
	if Net.RateLimited(player, "code", 1.5) then
		return result(false, "Slow down!")
	end
	return result(RewardsService.RedeemCode(player, code))
end
