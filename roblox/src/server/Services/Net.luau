-- Small helpers for talking to clients.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local NotifyRemote = Remotes:WaitForChild("Notify") :: RemoteEvent

local Net = {}

Net.Remotes = Remotes

-- Shows a toast on the player's screen. Kinds the client knows:
-- "Bought", "NeedCash", "Collected", "Reward", "Rebirth", "Info", "Error"
function Net.Notify(player: Player, kind: string, payload: { [string]: any }?)
	NotifyRemote:FireClient(player, kind, payload or {})
end

local lastCall: { [Player]: { [string]: number } } = {}

-- Returns true if the player called `key` less than `seconds` ago (and should be ignored).
function Net.RateLimited(player: Player, key: string, seconds: number): boolean
	local calls = lastCall[player]
	if not calls then
		calls = {}
		lastCall[player] = calls
	end
	local now = os.clock()
	local last = calls[key]
	if last and now - last < seconds then
		return true
	end
	calls[key] = now
	return false
end

Players.PlayerRemoving:Connect(function(player)
	lastCall[player] = nil
end)

return Net
