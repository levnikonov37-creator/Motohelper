--[[
	TycoonService — plots, buy buttons, machines, the belt and rebirths.
]]

local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local Builders = require(script.Parent.Builders)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local Net = require(script.Parent.Net)
local WorldBuilder = require(script.Parent.WorldBuilder)

local TycoonService = {}

type Plot = {
	Index: number,
	CFrame: CFrame,
	Parts: Builders.PlotParts,
	Owner: Player?,
	NextDrop: { [string]: number },
	Buttons: { [string]: Part },
}

local plots: { Plot } = {}
local plotOf: { [Player]: Plot } = {}
local lastNeedCash: { [Player]: number } = {}

local DROP_GROUP = "Drops"
local CHARACTER_GROUP = "Characters"

local dropperItems = {}
local showroomItems = {}
for _, item in Config.Items do
	if item.Kind == "Dropper" then
		table.insert(dropperItems, item)
	elseif item.Kind == "Showroom" then
		table.insert(showroomItems, item)
	end
end

------------------------------------------------------------------------
-- Building items
------------------------------------------------------------------------

local function requirementsMet(data: any, item: any): boolean
	for _, required in item.Requires do
		if not data.Owned[required] then
			return false
		end
	end
	return true
end

local function buildItem(plot: Plot, item: any, animate: boolean)
	local owner = plot.Owner
	local folder = plot.Parts.Items
	local model: Model

	if item.Kind == "Dropper" then
		model = Builders.Dropper(folder, plot.CFrame, item)
	elseif item.Kind == "Upgrader" then
		local zone
		model, zone = Builders.Upgrader(folder, plot.CFrame, item)
		local key = "Up_" .. item.Id
		zone.Touched:Connect(function(hit)
			if hit.Parent ~= plot.Parts.Drops or hit:GetAttribute(key) then
				return
			end
			hit:SetAttribute(key, true)
			hit:SetAttribute("Value", (hit:GetAttribute("Value") or 0) * item.Mult)
			hit.Color = item.Color
			hit.Material = Enum.Material.Neon
		end)
	elseif item.Kind == "Showroom" then
		model = Builders.Showroom(folder, plot.CFrame, item)
	else
		model = Builders.Decor(folder, plot.CFrame, item, if owner then owner.DisplayName else "Player")
	end

	if animate then
		Builders.FadeIn(model)
	end
end

local function clearPlot(plot: Plot)
	plot.Parts.Items:ClearAllChildren()
	plot.Parts.Buttons:ClearAllChildren()
	plot.Parts.Drops:ClearAllChildren()
	table.clear(plot.Buttons)
	table.clear(plot.NextDrop)
end

------------------------------------------------------------------------
-- Buttons
------------------------------------------------------------------------

local refreshButtons: (Plot) -> ()

local function tryBuy(player: Player, itemId: string)
	local plot = plotOf[player]
	local data = DataService.Get(player)
	local item = Config.ItemsById[itemId]
	if not plot or not data or not item then
		return
	end
	if data.Owned[itemId] or not requirementsMet(data, item) then
		return
	end

	if not EconomyService.TrySpend(player, item.Price) then
		local now = os.clock()
		if not lastNeedCash[player] or now - lastNeedCash[player] > 2.5 then
			lastNeedCash[player] = now
			Net.Notify(player, "NeedCash", { Name = item.Name, Missing = item.Price - data.Cash })
		end
		return
	end

	data.Owned[itemId] = true
	buildItem(plot, item, true)
	refreshButtons(plot)
	EconomyService.Sync(player)
	Net.Notify(player, "Bought", { Name = item.Name })
end

local function createButton(plot: Plot, item: any)
	local pad = Builders.Button(plot.Parts.Buttons, plot.CFrame, item)
	plot.Buttons[item.Id] = pad
	pad.Touched:Connect(function(hit)
		local character = hit.Parent
		if not character then
			return
		end
		local player = Players:GetPlayerFromCharacter(character)
		if not player or player ~= plot.Owner then
			return
		end
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not humanoid or humanoid.Health <= 0 then
			return
		end
		if Net.RateLimited(player, "button", 0.4) then
			return
		end
		tryBuy(player, item.Id)
	end)
end

refreshButtons = function(plot: Plot)
	local owner = plot.Owner
	local data = owner and DataService.Get(owner)
	for _, item in Config.Items do
		local shouldShow = data ~= nil and not data.Owned[item.Id] and requirementsMet(data, item)
		local pad = plot.Buttons[item.Id]
		if shouldShow and not pad then
			createButton(plot, item)
		elseif not shouldShow and pad then
			pad:Destroy()
			plot.Buttons[item.Id] = nil
		end
	end
end

------------------------------------------------------------------------
-- Drops, selling, collecting
------------------------------------------------------------------------

local function spawnDrop(plot: Plot, item: any)
	local drops = plot.Parts.Drops
	if #drops:GetChildren() >= Config.MaxDropsPerPlot then
		return
	end
	local drop = Instance.new("Part")
	drop.Name = "Drop"
	drop.Size = Vector3.one * item.DropSize
	drop.Color = item.DropColor
	drop.Material = Enum.Material.Metal
	drop.TopSurface = Enum.SurfaceType.Smooth
	drop.BottomSurface = Enum.SurfaceType.Smooth
	drop.CollisionGroup = DROP_GROUP
	drop.CFrame = plot.CFrame * CFrame.new(item.X, 5.3, Config.ConveyorZ)
	drop:SetAttribute("Value", item.Value)
	drop.Parent = drops
	pcall(function()
		drop:SetNetworkOwner(nil) -- server owns the physics, so exploiters can't fling parts around
	end)
	task.delay(45, function()
		if drop.Parent then
			drop:Destroy()
		end
	end)
end

local function updateBankLabel(plot: Plot)
	local owner = plot.Owner
	if not owner then
		plot.Parts.BankLabel.Text = "COLLECT"
		return
	end
	if EconomyService.HasPass(owner, "AutoCollect") then
		plot.Parts.BankLabel.Text = "🧲 AUTO COLLECT"
	else
		plot.Parts.BankLabel.Text = "COLLECT " .. Format.Money(owner:GetAttribute("Bank") or 0)
	end
end

local function wirePlot(plot: Plot)
	local parts = plot.Parts

	parts.Seller.Touched:Connect(function(hit)
		if hit.Parent ~= parts.Drops or hit:GetAttribute("Sold") then
			return
		end
		hit:SetAttribute("Sold", true)
		local value = hit:GetAttribute("Value") or 0
		hit:Destroy()
		local owner = plot.Owner
		if owner then
			EconomyService.AddToBank(owner, value * EconomyService.GetMultiplier(owner))
		end
	end)

	parts.CollectPad.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player or player ~= plot.Owner or Net.RateLimited(player, "collect", 0.5) then
			return
		end
		local amount = EconomyService.CollectBank(player)
		if amount > 0 then
			Net.Notify(player, "Collected", { Amount = amount })
		end
	end)
end

------------------------------------------------------------------------
-- Owners
------------------------------------------------------------------------

local function teleportToPlot(player: Player)
	local plot = plotOf[player]
	local character = player.Character
	if not plot or not character then
		return
	end
	local root = character:WaitForChild("HumanoidRootPart", 10)
	task.wait(0.1) -- let Roblox finish placing the character at the hub spawn first
	if root and character.Parent and plotOf[player] == plot then
		character:PivotTo(plot.Parts.SpawnCFrame)
	end
end

local function setCharacterCollisionGroup(character: Model)
	for _, descendant in character:GetDescendants() do
		if descendant:IsA("BasePart") then
			descendant.CollisionGroup = CHARACTER_GROUP
		end
	end
	character.DescendantAdded:Connect(function(descendant)
		if descendant:IsA("BasePart") then
			descendant.CollisionGroup = CHARACTER_GROUP
		end
	end)
end

local function assignPlot(player: Player, data: any)
	if plotOf[player] or player.Parent == nil then
		return
	end
	local plot: Plot? = nil
	for _, candidate in plots do
		if candidate.Owner == nil then
			plot = candidate
			break
		end
	end
	if not plot then
		Net.Notify(player, "Error", { Text = "All garages are taken! Join another server." })
		return
	end

	plot.Owner = player
	plotOf[player] = plot
	plot.Parts.Model:SetAttribute("Owner", player.UserId)
	plot.Parts.OwnerLabel.Text = string.upper(player.DisplayName) .. "'S GARAGE"
	player:SetAttribute("Plot", plot.Parts.Model.Name)

	for _, item in Config.Items do
		if data.Owned[item.Id] then
			buildItem(plot, item, false)
		end
	end
	refreshButtons(plot)
	updateBankLabel(plot)

	player:GetAttributeChangedSignal("Bank"):Connect(function()
		if plotOf[player] == plot then
			updateBankLabel(plot)
		end
	end)
	player:GetAttributeChangedSignal("Pass_AutoCollect"):Connect(function()
		if plotOf[player] == plot then
			updateBankLabel(plot)
		end
	end)

	task.spawn(teleportToPlot, player)
end

local function releasePlot(player: Player)
	local plot = plotOf[player]
	plotOf[player] = nil
	lastNeedCash[player] = nil
	if not plot then
		return
	end
	plot.Owner = nil
	clearPlot(plot)
	plot.Parts.Model:SetAttribute("Owner", nil)
	plot.Parts.OwnerLabel.Text = "FREE GARAGE"
	updateBankLabel(plot)
end

------------------------------------------------------------------------
-- Public API
------------------------------------------------------------------------

function TycoonService.GetPlot(player: Player)
	return plotOf[player]
end

function TycoonService.Rebirth(player: Player): (boolean, string)
	local data = DataService.Get(player)
	local plot = plotOf[player]
	if not data or not plot then
		return false, "Your garage isn't ready yet."
	end
	local cost = Config.RebirthCost(data.Rebirths)
	if data.Cash < cost then
		return false, "You need " .. Format.Money(cost - data.Cash) .. " more to rebirth."
	end

	data.Cash = 0
	data.Bank = 0
	data.Rebirths += 1
	data.Owned = {}
	clearPlot(plot)
	refreshButtons(plot)
	EconomyService.Sync(player)
	task.spawn(DataService.Save, player)

	Net.Notify(player, "Rebirth", { Rebirths = data.Rebirths, Multiplier = Config.RebirthMultiplier(data.Rebirths) })
	return true, "Rebirth " .. data.Rebirths .. "! Cash bonus is now x" .. Config.RebirthMultiplier(data.Rebirths)
end

function TycoonService.Start(plotsFolder: Folder)
	PhysicsService:RegisterCollisionGroup(DROP_GROUP)
	PhysicsService:RegisterCollisionGroup(CHARACTER_GROUP)
	PhysicsService:CollisionGroupSetCollidable(DROP_GROUP, CHARACTER_GROUP, false)

	for index, plotCF in WorldBuilder.PlotCFrames() do
		local plot: Plot = {
			Index = index,
			CFrame = plotCF,
			Parts = Builders.Plot(plotsFolder, "Plot" .. index, plotCF),
			Owner = nil,
			NextDrop = {},
			Buttons = {},
		}
		wirePlot(plot)
		table.insert(plots, plot)
	end

	local function onPlayerAdded(player: Player)
		player.CharacterAdded:Connect(function(character)
			setCharacterCollisionGroup(character)
			if plotOf[player] then
				task.defer(teleportToPlot, player)
			end
		end)
		if player.Character then
			setCharacterCollisionGroup(player.Character)
		end
	end
	Players.PlayerAdded:Connect(onPlayerAdded)
	for _, player in Players:GetPlayers() do
		onPlayerAdded(player)
	end
	Players.PlayerRemoving:Connect(releasePlot)
	DataService.OnLoaded(assignPlot)

	-- machines drop parts
	task.spawn(function()
		while true do
			task.wait(0.1)
			local now = os.clock()
			for _, plot in plots do
				local owner = plot.Owner
				local data = owner and DataService.Get(owner)
				if owner and data then
					local speed = EconomyService.GetMachineSpeed(owner)
					for _, item in dropperItems do
						if data.Owned[item.Id] then
							local nextAt = plot.NextDrop[item.Id]
							if nextAt == nil then
								plot.NextDrop[item.Id] = now + 0.5
							elseif now >= nextAt then
								plot.NextDrop[item.Id] = now + item.Interval / speed
								spawnDrop(plot, item)
							end
						end
					end
				end
			end
		end
	end)

	-- showroom bikes earn every second
	task.spawn(function()
		while true do
			task.wait(1)
			for _, plot in plots do
				local owner = plot.Owner
				local data = owner and DataService.Get(owner)
				if owner and data then
					local perSecond = 0
					for _, item in showroomItems do
						if data.Owned[item.Id] then
							perSecond += item.PerSecond
						end
					end
					if perSecond > 0 then
						EconomyService.AddToBank(owner, perSecond * EconomyService.GetMultiplier(owner))
					end
				end
			end
		end
	end)
end

return TycoonService
