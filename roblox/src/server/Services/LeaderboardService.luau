--[[
	LeaderboardService — global "Top Earners" board (all servers, all time).
	Uses an OrderedDataStore, so it only works in a published game
	(or in Studio with API access enabled).
]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local DataService = require(script.Parent.DataService)

local LeaderboardService = {}

local UPDATE_INTERVAL = 120
local MAX_SCORE = 2 ^ 53

local names: { [number]: string } = {}

local function nameOf(userId: number): string
	if names[userId] then
		return names[userId]
	end
	local ok, name = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)
	if ok and name then
		names[userId] = name
		return name
	end
	return "Player"
end

local function row(list: Frame, rank: number, text: string, value: string)
	local frame = Instance.new("Frame")
	frame.Name = "Row" .. rank
	frame.LayoutOrder = rank
	frame.Size = UDim2.fromScale(1, 0.088)
	frame.BackgroundColor3 = if rank % 2 == 0 then Color3.fromRGB(38, 38, 46) else Color3.fromRGB(30, 30, 37)
	frame.BorderSizePixel = 0

	local left = Instance.new("TextLabel")
	left.BackgroundTransparency = 1
	left.Position = UDim2.fromScale(0.03, 0)
	left.Size = UDim2.fromScale(0.62, 1)
	left.Font = Enum.Font.GothamBold
	left.TextScaled = true
	left.TextXAlignment = Enum.TextXAlignment.Left
	left.TextColor3 = if rank <= 3 then Color3.fromRGB(255, 205, 60) else Color3.fromRGB(235, 235, 235)
	left.Text = text
	left.Parent = frame

	local right = Instance.new("TextLabel")
	right.BackgroundTransparency = 1
	right.Position = UDim2.fromScale(0.65, 0)
	right.Size = UDim2.fromScale(0.32, 1)
	right.Font = Enum.Font.GothamBold
	right.TextScaled = true
	right.TextXAlignment = Enum.TextXAlignment.Right
	right.TextColor3 = Color3.fromRGB(120, 255, 140)
	right.Text = value
	right.Parent = frame

	frame.Parent = list
end

local function render(list: Frame, entries: { { name: string, value: number } }, message: string?)
	for _, child in list:GetChildren() do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end
	if message then
		row(list, 1, message, "")
		return
	end
	for rank, entry in entries do
		row(list, rank, "#" .. rank .. "  " .. entry.name, Format.Money(entry.value))
	end
end

function LeaderboardService.Start(list: Frame)
	local ok, store = pcall(function()
		return DataStoreService:GetOrderedDataStore(Config.LeaderboardStoreName)
	end)
	if not ok then
		render(list, {}, "Works in the published game")
		return
	end

	local function submit(player: Player)
		local data = DataService.Get(player)
		if data and data.TotalEarned > 0 then
			pcall(function()
				store:SetAsync(tostring(player.UserId), math.floor(math.min(data.TotalEarned, MAX_SCORE)))
			end)
		end
	end

	local function refresh()
		local success, pages = pcall(function()
			return store:GetSortedAsync(false, 10)
		end)
		if not success then
			render(list, {}, "Works in the published game")
			return
		end
		local entries = {}
		for _, entry in pages:GetCurrentPage() do
			local userId = tonumber(entry.key)
			if userId then
				table.insert(entries, { name = nameOf(userId), value = entry.value })
			end
		end
		if #entries == 0 then
			render(list, {}, "Be the first on the board!")
		else
			render(list, entries)
		end
	end

	Players.PlayerRemoving:Connect(submit)

	task.spawn(function()
		while true do
			for _, player in Players:GetPlayers() do
				submit(player)
			end
			refresh()
			task.wait(UPDATE_INTERVAL)
		end
	end)
end

return LeaderboardService
