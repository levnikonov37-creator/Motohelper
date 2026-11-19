--[[
	WorldBuilder — builds the map when the server starts: ground, road,
	spawn arch, trees, a jump park and the global leaderboard board.
	Plots are laid out in two rows of three facing the road.
]]

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Builders = require(script.Parent.Builders)

local WorldBuilder = {}

local part = Builders.Part

local function tree(parent: Instance, position: Vector3, scale: number)
	local trunkHeight = 6 * scale
	part(parent, Vector3.new(1.5 * scale, trunkHeight, 1.5 * scale), CFrame.new(position + Vector3.new(0, trunkHeight / 2, 0)), Color3.fromRGB(105, 70, 40), Enum.Material.Wood)
	local leaves = part(parent, Vector3.new(8, 8, 8) * scale, CFrame.new(position + Vector3.new(0, trunkHeight + 3 * scale, 0)), Color3.fromRGB(60, 150, 60), Enum.Material.Grass)
	leaves.Shape = Enum.PartType.Ball
end

-- Plot origins: centre of the floor surface, LookVector pointing at the road.
function WorldBuilder.PlotCFrames(): { CFrame }
	local result = {}
	local columns = { -100, 0, 100 }
	for i = 1, Config.PlotCount do
		local column = columns[(i - 1) % 3 + 1]
		local north = i <= 3
		local z = if north then 60 else -60
		local origin = Vector3.new(column, 0.5, z)
		local facing = if north then Vector3.new(0, 0, -1) else Vector3.new(0, 0, 1)
		table.insert(result, CFrame.lookAt(origin, origin + facing))
	end
	return result
end

-- Returns the folder plots go into and the leaderboard's list frame.
function WorldBuilder.Build(): (Folder, Frame)
	local map = Instance.new("Folder")
	map.Name = "Map"
	map.Parent = workspace

	-- ground and road
	part(map, Vector3.new(520, 4, 420), CFrame.new(0, -2, 0), Color3.fromRGB(95, 165, 80), Enum.Material.Grass).Name = "Ground"
	part(map, Vector3.new(520, 0.2, 40), CFrame.new(0, 0.1, 0), Color3.fromRGB(55, 55, 60), Enum.Material.Asphalt).Name = "Road"
	for x = -240, 240, 16 do
		part(map, Vector3.new(7, 0.05, 0.6), CFrame.new(x, 0.22, 0), Color3.fromRGB(240, 240, 240))
	end

	-- spawn + arch with the game title
	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(0, 0.5, 0)
	spawn.Material = Enum.Material.Neon
	spawn.Color = Color3.fromRGB(255, 140, 0)
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.Parent = map

	local archColor = Color3.fromRGB(30, 30, 36)
	for _, side in { -1, 1 } do
		part(map, Vector3.new(2, 24, 2), CFrame.new(-30, 12, side * 17), archColor, Enum.Material.Metal)
	end
	local title = part(map, Vector3.new(4, 7, 36), CFrame.new(-30, 25, 0), archColor, Enum.Material.Metal)
	Builders.SurfaceText(title, Enum.NormalId.Right, "MOTO EMPIRE TYCOON", Color3.fromRGB(255, 150, 20))
	Builders.SurfaceText(title, Enum.NormalId.Left, "MOTO EMPIRE TYCOON", Color3.fromRGB(255, 150, 20))

	-- street lamps between the plots
	for _, x in { -150, -50, 50, 150 } do
		for _, z in { -18, 18 } do
			part(map, Vector3.new(0.8, 16, 0.8), CFrame.new(x, 8, z), archColor, Enum.Material.Metal)
			local lamp = part(map, Vector3.new(3, 0.8, 3), CFrame.new(x, 16.4, z), Color3.fromRGB(255, 230, 170), Enum.Material.Neon)
			local light = Instance.new("PointLight")
			light.Range = 40
			light.Brightness = 1
			light.Parent = lamp
		end
	end

	-- jump park at the east end of the road
	local ramps = {
		{ x = 175, z = -8, size = Vector3.new(12, 4, 12) },
		{ x = 198, z = 6, size = Vector3.new(12, 7, 16) },
		{ x = 224, z = -4, size = Vector3.new(14, 10, 20) },
	}
	for _, ramp in ramps do
		local position = Vector3.new(ramp.x, ramp.size.Y / 2, ramp.z)
		local wedge = Instance.new("WedgePart")
		wedge.Anchored = true
		wedge.Size = ramp.size
		-- the slope faces -X, so you run up it heading east
		wedge.CFrame = CFrame.lookAt(position, position + Vector3.new(-1, 0, 0))
		wedge.Color = Color3.fromRGB(150, 105, 60)
		wedge.Material = Enum.Material.Ground
		wedge.Parent = map
	end
	local parkSign = part(map, Vector3.new(1, 5, 18), CFrame.new(160, 6, -15), archColor, Enum.Material.Metal)
	Builders.SurfaceText(parkSign, Enum.NormalId.Left, "JUMP PARK", Color3.fromRGB(255, 150, 20))
	part(map, Vector3.new(0.8, 4, 0.8), CFrame.new(160, 2, -15), archColor, Enum.Material.Metal)

	-- global leaderboard at the west end, facing the road
	local boardPosition = Vector3.new(-175, 12, 0)
	local board = part(map, Vector3.new(26, 22, 1), CFrame.lookAt(boardPosition, boardPosition + Vector3.new(1, 0, 0)), Color3.fromRGB(20, 20, 26), Enum.Material.Metal)
	board.Name = "Leaderboard"
	for _, side in { -1, 1 } do
		part(map, Vector3.new(1.2, 24, 1.2), CFrame.new(-175.5, 12, side * 13.5), archColor, Enum.Material.Metal)
	end
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 25
	gui.LightInfluence = 0
	gui.Parent = board

	local header = Instance.new("TextLabel")
	header.BackgroundTransparency = 1
	header.Size = UDim2.fromScale(1, 0.13)
	header.Font = Enum.Font.GothamBlack
	header.TextScaled = true
	header.TextColor3 = Color3.fromRGB(255, 200, 40)
	header.Text = "🏆 TOP EARNERS"
	header.Parent = gui

	local list = Instance.new("Frame")
	list.Name = "List"
	list.BackgroundTransparency = 1
	list.Position = UDim2.fromScale(0.05, 0.15)
	list.Size = UDim2.fromScale(0.9, 0.82)
	list.Parent = gui
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0.01, 0)
	layout.Parent = list

	-- trees around the edge of the map (fixed seed so the map is always the same)
	local random = Random.new(7)
	for _ = 1, 70 do
		local x = random:NextNumber(-250, 250)
		local z = random:NextNumber(-200, 200)
		local clearOfPlots = math.abs(z) > 106 or math.abs(x) > 150
		local clearOfRoad = math.abs(z) > 26
		local clearOfPark = not (x > 150 and math.abs(z) < 30)
		if clearOfPlots and clearOfRoad and clearOfPark then
			tree(map, Vector3.new(x, 0, z), random:NextNumber(0.8, 1.4))
		end
	end

	local plots = Instance.new("Folder")
	plots.Name = "Plots"
	plots.Parent = workspace

	return plots, list
end

return WorldBuilder
