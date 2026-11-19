--[[
	DataService — saves player progress in a DataStore.

	* Session lock: a profile is "owned" by one server at a time, so a player hopping
	  servers can't duplicate or roll back progress.
	* Autosave every AUTOSAVE_INTERVAL seconds, on leave and on server shutdown.
	* In Studio without "Enable Studio Access to API Services" it runs in memory
	  (nothing is saved) so the game is still playable for testing.
]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)

local DataService = {}

local LOCK_TIMEOUT = 180 -- a lock not refreshed for this long is considered abandoned
local AUTOSAVE_INTERVAL = 90
local LOAD_ATTEMPTS = 8
local FORCE_LOAD_AFTER = 5 -- after this many attempts, take the lock from a dead server
local MAX_PURCHASE_HISTORY = 100

local dataStore: DataStore? = nil
local memoryMode = false

type Profile = {
	Data: any,
	Released: boolean,
	Saving: boolean,
}

local profiles: { [Player]: Profile } = {}
local loadedCallbacks: { (Player, any) -> () } = {}

local function newData()
	return {
		Cash = 0,
		Bank = 0,
		Rebirths = 0,
		TotalEarned = 0,
		Owned = {},
		DailyLast = 0,
		DailyStreak = 0,
		Codes = {},
		BoostEndsAt = 0,
		Purchases = {},
		FirstJoin = os.time(),
	}
end

-- Adds fields that are missing in old saves (when you add new fields to newData()).
local function reconcile(data: any)
	if type(data) ~= "table" then
		return newData()
	end
	for key, value in newData() do
		if data[key] == nil then
			data[key] = value
		end
	end
	return data
end

local function keyFor(userId: number): string
	return "player_" .. userId
end

local function loadAsync(player: Player): any
	if memoryMode then
		return newData()
	end
	if not dataStore then
		return nil
	end
	local store = dataStore :: DataStore
	local key = keyFor(player.UserId)

	for attempt = 1, LOAD_ATTEMPTS do
		if player.Parent == nil then
			return nil
		end
		local force = attempt >= FORCE_LOAD_AFTER
		local lockedElsewhere = false

		local ok, result = pcall(function()
			return store:UpdateAsync(key, function(stored)
				lockedElsewhere = false
				if type(stored) ~= "table" then
					stored = {}
				end
				local lock = stored.Lock
				if
					not force
					and type(lock) == "table"
					and lock.JobId ~= game.JobId
					and os.time() - (lock.Time or 0) < LOCK_TIMEOUT
				then
					lockedElsewhere = true
					return nil -- cancel the write, someone else owns it
				end
				stored.Lock = { JobId = game.JobId, Time = os.time() }
				return stored, { player.UserId }
			end)
		end)

		if ok and not lockedElsewhere and type(result) == "table" then
			return reconcile(result.Data)
		end
		if not ok then
			warn(("[DataService] load failed for %s (attempt %d): %s"):format(player.Name, attempt, tostring(result)))
		end
		task.wait(if lockedElsewhere then 6 else 3)
	end
	return nil
end

local function saveAsync(player: Player, release: boolean): boolean
	local profile = profiles[player]
	if not profile then
		return false
	end
	-- one save at a time per player, so an old autosave can't re-lock after release
	while profile.Saving do
		task.wait()
	end
	if profile.Released then
		return false
	end
	if memoryMode then
		if release then
			profile.Released = true
		end
		return true
	end
	if not dataStore then
		return false
	end
	local store = dataStore :: DataStore

	profile.Saving = true
	local lockedElsewhere = false
	local ok, err = pcall(function()
		store:UpdateAsync(keyFor(player.UserId), function(stored)
			lockedElsewhere = false
			if type(stored) ~= "table" then
				stored = {}
			end
			local lock = stored.Lock
			if type(lock) == "table" and lock.JobId ~= game.JobId then
				lockedElsewhere = true
				return nil
			end
			stored.Data = profile.Data
			stored.Lock = if release then nil else { JobId = game.JobId, Time = os.time() }
			return stored, { player.UserId }
		end)
	end)
	profile.Saving = false

	if lockedElsewhere then
		-- Another server force-loaded this player. Don't overwrite their newer data.
		profile.Released = true
		if player.Parent then
			player:Kick("Your progress was opened on another server. Please rejoin.")
		end
		return false
	end
	if not ok then
		warn(("[DataService] save failed for %s: %s"):format(player.Name, tostring(err)))
		return false
	end
	if release then
		profile.Released = true
	end
	return true
end

local function onPlayerAdded(player: Player)
	local data = loadAsync(player)
	if player.Parent == nil then
		-- left while loading: release the lock we may have taken
		if data and not memoryMode and dataStore then
			profiles[player] = { Data = data, Released = false, Saving = false }
			saveAsync(player, true)
			profiles[player] = nil
		end
		return
	end
	if not data then
		player:Kick("Couldn't load your progress (Roblox servers are busy). Please rejoin in a minute.")
		return
	end

	profiles[player] = { Data = data, Released = false, Saving = false }
	player:SetAttribute("DataLoaded", true)
	for _, callback in loadedCallbacks do
		task.spawn(callback, player, data)
	end
end

local function onPlayerRemoving(player: Player)
	if profiles[player] then
		saveAsync(player, true)
		profiles[player] = nil
	end
end

------------------------------------------------------------------------
-- Public API
------------------------------------------------------------------------

function DataService.Start()
	local ok, store = pcall(function()
		return DataStoreService:GetDataStore(Config.DataStoreName)
	end)
	if ok then
		local probeOk, probeErr = pcall(function()
			return store:GetAsync("__probe")
		end)
		if not probeOk and RunService:IsStudio() then
			memoryMode = true
			warn("[DataService] DataStores unavailable in Studio (" .. tostring(probeErr) .. ").")
			warn("[DataService] Playing WITHOUT saving. Game Settings > Security > Enable Studio Access to API Services to test saving.")
		else
			-- in a live game a failed probe is a temporary outage: loads will retry
			dataStore = store
		end
	elseif RunService:IsStudio() then
		memoryMode = true
		warn("[DataService] DataStores unavailable in Studio, playing WITHOUT saving.")
	else
		warn("[DataService] GetDataStore failed: " .. tostring(store))
	end

	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(onPlayerRemoving)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end

	task.spawn(function()
		while true do
			task.wait(AUTOSAVE_INTERVAL)
			for player in profiles do
				task.spawn(saveAsync, player, false)
				task.wait(0.5)
			end
		end
	end)

	game:BindToClose(function()
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				saveAsync(player, true)
				pending -= 1
			end)
		end
		local started = os.clock()
		while pending > 0 and os.clock() - started < 25 do
			task.wait(0.1)
		end
	end)
end

-- Called with (player, data) once a player's data is loaded.
function DataService.OnLoaded(callback: (Player, any) -> ())
	table.insert(loadedCallbacks, callback)
	for player, profile in profiles do
		if not profile.Released then
			task.spawn(callback, player, profile.Data)
		end
	end
end

-- Returns the live data table (mutate it directly) or nil if not loaded.
function DataService.Get(player: Player): any
	local profile = profiles[player]
	if profile and not profile.Released then
		return profile.Data
	end
	return nil
end

function DataService.WaitForData(player: Player, timeout: number): any
	local started = os.clock()
	while player.Parent and os.clock() - started < timeout do
		local data = DataService.Get(player)
		if data then
			return data
		end
		task.wait(0.25)
	end
	return DataService.Get(player)
end

-- Saves now. Returns true only if the save reached the DataStore.
function DataService.Save(player: Player): boolean
	return saveAsync(player, false)
end

function DataService.IsMemoryMode(): boolean
	return memoryMode
end

function DataService.HasPurchase(data: any, purchaseId: string): boolean
	return table.find(data.Purchases, purchaseId) ~= nil
end

function DataService.RecordPurchase(data: any, purchaseId: string)
	table.insert(data.Purchases, purchaseId)
	while #data.Purchases > MAX_PURCHASE_HISTORY do
		table.remove(data.Purchases, 1)
	end
end

return DataService
