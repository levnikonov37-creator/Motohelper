--[[
	Builders — everything visible is built from plain Parts here, so the game
	needs no uploaded models. Replace any builder with your own model later
	(e.g. clone from ServerStorage) without touching the game logic.

	All positions are local to a plot: origin = centre of the floor surface,
	local -Z = front of the plot (towards the road).
]]

local TweenService = game:GetService("TweenService")

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Format = require(game:GetService("ReplicatedStorage").Shared.Format)

local Builders = {}

local DARK = Color3.fromRGB(45, 47, 55)
local STEEL = Color3.fromRGB(160, 165, 175)
local WHITE = Color3.fromRGB(245, 245, 245)
local GOLD = Color3.fromRGB(255, 200, 40)

local function part(parent: Instance, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material?, props: { [string]: any }?): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.Size = size
	p.CFrame = cframe
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if props then
		for key, value in props do
			(p :: any)[key] = value
		end
	end
	p.Parent = parent
	return p
end
Builders.Part = part

local function cylinder(parent: Instance, length: number, diameter: number, cframe: CFrame, color: Color3, material: Enum.Material?): Part
	local p = part(parent, Vector3.new(length, diameter, diameter), cframe, color, material)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local UPRIGHT = CFrame.Angles(0, 0, math.rad(90)) -- turns a cylinder's axis from X to Y
local SIDEWAYS = CFrame.Angles(0, math.rad(90), 0) -- turns a cylinder's axis from X to Z

-- Floating text above a part. Returns the TextLabel so callers can update it.
function Builders.Billboard(adornee: BasePart, text: string, color: Color3, height: number, width: number?, maxDistance: number?): TextLabel
	local gui = Instance.new("BillboardGui")
	gui.Name = "Label"
	gui.Size = UDim2.fromScale(width or 8, 1.6)
	gui.StudsOffsetWorldSpace = Vector3.new(0, height, 0)
	gui.MaxDistance = maxDistance or 90
	gui.LightInfluence = 0
	gui.Adornee = adornee

	local label = Instance.new("TextLabel")
	label.Name = "Text"
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.2
	label.Text = text
	label.Parent = gui

	gui.Parent = adornee
	return label
end

-- Text painted on one face of a part.
function Builders.SurfaceText(target: BasePart, face: Enum.NormalId, text: string, color: Color3, background: Color3?): TextLabel
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 30
	gui.LightInfluence = 0

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundColor3 = background or DARK
	label.BackgroundTransparency = if background then 0 else 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = color
	label.Text = text
	label.Parent = gui

	local padding = Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0.04, 0)
	padding.PaddingRight = UDim.new(0.04, 0)
	padding.PaddingTop = UDim.new(0.08, 0)
	padding.PaddingBottom = UDim.new(0.08, 0)
	padding.Parent = label

	gui.Parent = target
	return label
end

-- New things fade in instead of popping.
function Builders.FadeIn(model: Instance)
	for _, descendant in model:GetDescendants() do
		if descendant:IsA("BasePart") then
			local target = descendant.Transparency
			descendant.Transparency = 1
			TweenService:Create(descendant, TweenInfo.new(0.6, Enum.EasingStyle.Quad), { Transparency = target }):Play()
		end
	end
end

------------------------------------------------------------------------
-- Plot base: floor, belt, seller, collect pad, entrance sign
------------------------------------------------------------------------

export type PlotParts = {
	Model: Model,
	Floor: Part,
	Conveyor: Part,
	Seller: Part,
	CollectPad: Part,
	BankLabel: TextLabel,
	OwnerLabel: TextLabel,
	Items: Folder,
	Buttons: Folder,
	Drops: Folder,
	SpawnCFrame: CFrame,
}

function Builders.Plot(parent: Instance, name: string, plotCF: CFrame): PlotParts
	local model = Instance.new("Model")
	model.Name = name

	local size = Config.PlotSize
	local z = Config.ConveyorZ

	local floor = part(model, Vector3.new(size, 1, size), plotCF * CFrame.new(0, -0.5, 0), Color3.fromRGB(110, 115, 125), Enum.Material.Concrete)
	floor.Name = "Floor"

	-- conveyor belt running along local +X
	local conveyor = part(model, Vector3.new(64, 1, 5), plotCF * CFrame.new(-2, 0.5, z), Color3.fromRGB(35, 35, 40), Enum.Material.DiamondPlate)
	conveyor.Name = "Conveyor"
	for _, side in { -1, 1 } do
		part(model, Vector3.new(64, 1.5, 0.4), plotCF * CFrame.new(-2, 1.25, z + side * 2.7), Color3.fromRGB(255, 200, 0))
	end
	part(model, Vector3.new(0.4, 1.5, 5), plotCF * CFrame.new(-34.2, 1.25, z), Color3.fromRGB(255, 200, 0))

	-- the dealer at the end of the belt buys everything that reaches it
	local seller = part(model, Vector3.new(3, 6, 7), plotCF * CFrame.new(31.5, 3, z), Color3.fromRGB(46, 204, 113), Enum.Material.Neon)
	seller.Name = "Seller"
	Builders.Billboard(seller, "💲 SELL", WHITE, 5, 6)

	-- step on it to move the plot's bank into your wallet
	local collectPad = part(model, Vector3.new(6, 0.6, 6), plotCF * CFrame.new(32, 0.3, 4), Color3.fromRGB(46, 204, 113), Enum.Material.Neon)
	collectPad.Name = "CollectPad"
	local bankLabel = Builders.Billboard(collectPad, "COLLECT $0", WHITE, 3.5, 9)

	-- entrance sign with the owner's name
	for _, side in { -1, 1 } do
		part(model, Vector3.new(1, 11, 1), plotCF * CFrame.new(side * 11, 5.5, -40), DARK, Enum.Material.Metal)
	end
	local signBoard = part(model, Vector3.new(23, 3.2, 0.6), plotCF * CFrame.new(0, 10, -40), DARK, Enum.Material.Metal)
	local ownerLabel = Builders.SurfaceText(signBoard, Enum.NormalId.Front, "FREE GARAGE", GOLD)
	-- the back of the sign faces the owner
	Builders.SurfaceText(signBoard, Enum.NormalId.Back, "MOTO EMPIRE", GOLD)

	local items = Instance.new("Folder")
	items.Name = "Items"
	items.Parent = model
	local buttons = Instance.new("Folder")
	buttons.Name = "Buttons"
	buttons.Parent = model
	local drops = Instance.new("Folder")
	drops.Name = "Drops"
	drops.Parent = model

	model.PrimaryPart = floor
	model.Parent = parent
	-- an anchored part with velocity moves whatever touches it: that's the belt
	conveyor.AssemblyLinearVelocity = plotCF:VectorToWorldSpace(Vector3.new(Config.ConveyorSpeed, 0, 0))

	return {
		Model = model,
		Floor = floor,
		Conveyor = conveyor,
		Seller = seller,
		CollectPad = collectPad,
		BankLabel = bankLabel,
		OwnerLabel = ownerLabel,
		Items = items,
		Buttons = buttons,
		Drops = drops,
		-- just outside the entrance, looking into the garage
		SpawnCFrame = plotCF * CFrame.new(0, 4, -45) * CFrame.Angles(0, math.pi, 0),
	}
end

------------------------------------------------------------------------
-- Buy buttons
------------------------------------------------------------------------

function Builders.Button(parent: Instance, plotCF: CFrame, item: any): Part
	local position = Config.ButtonPosition(item.Slot)
	local pad = part(parent, Vector3.new(0.6, 5, 5), plotCF * CFrame.new(position.X, 0.3, position.Z) * UPRIGHT, Color3.fromRGB(46, 204, 113), Enum.Material.Neon)
	pad.Shape = Enum.PartType.Cylinder
	pad.Name = item.Id
	pad:SetAttribute("ItemId", item.Id)
	pad:SetAttribute("Price", item.Price)

	local gui = Instance.new("BillboardGui")
	gui.Name = "Tag"
	gui.Size = UDim2.fromScale(7, 2.6)
	gui.StudsOffsetWorldSpace = Vector3.new(0, 3.2, 0)
	gui.MaxDistance = 70
	gui.LightInfluence = 0
	gui.Adornee = pad

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "ItemName"
	nameLabel.BackgroundTransparency = 1
	nameLabel.Size = UDim2.fromScale(1, 0.5)
	nameLabel.Font = Enum.Font.GothamBlack
	nameLabel.TextScaled = true
	nameLabel.TextColor3 = WHITE
	nameLabel.TextStrokeTransparency = 0.3
	nameLabel.Text = item.Name
	nameLabel.Parent = gui

	local priceLabel = Instance.new("TextLabel")
	priceLabel.Name = "Price"
	priceLabel.BackgroundTransparency = 1
	priceLabel.Position = UDim2.fromScale(0, 0.5)
	priceLabel.Size = UDim2.fromScale(1, 0.5)
	priceLabel.Font = Enum.Font.GothamBlack
	priceLabel.TextScaled = true
	priceLabel.TextColor3 = Color3.fromRGB(120, 255, 140)
	priceLabel.TextStrokeTransparency = 0.3
	priceLabel.Text = if item.Price <= 0 then "FREE" else Format.Money(item.Price)
	priceLabel.Parent = gui

	gui.Parent = pad
	return pad
end

------------------------------------------------------------------------
-- Machines
------------------------------------------------------------------------

function Builders.Dropper(parent: Instance, plotCF: CFrame, item: any): Model
	local model = Instance.new("Model")
	model.Name = item.Id
	local x, z = item.X, Config.ConveyorZ

	part(model, Vector3.new(1.2, 11, 1.2), plotCF * CFrame.new(x, 5.5, z + 4.6), DARK, Enum.Material.Metal)
	part(model, Vector3.new(1, 1, 4.6), plotCF * CFrame.new(x, 10.5, z + 2.3), DARK, Enum.Material.Metal)
	local body = part(model, Vector3.new(4, 3, 4), plotCF * CFrame.new(x, 9.5, z), item.Color, Enum.Material.Metal)
	part(model, Vector3.new(4.1, 0.4, 4.1), plotCF * CFrame.new(x, 9.0, z), WHITE, Enum.Material.Neon)
	part(model, Vector3.new(1.8, 1.4, 1.8), plotCF * CFrame.new(x, 7.3, z), DARK, Enum.Material.Metal)
	Builders.Billboard(body, item.Name, WHITE, 3, 7, 60)

	model.Parent = parent
	return model
end

-- Returns the model and the invisible-ish zone that upgrades parts passing through.
function Builders.Upgrader(parent: Instance, plotCF: CFrame, item: any): (Model, Part)
	local model = Instance.new("Model")
	model.Name = item.Id
	local x, z = item.X, Config.ConveyorZ

	for _, side in { -1, 1 } do
		part(model, Vector3.new(1, 7, 1), plotCF * CFrame.new(x, 3.5, z + side * 3.4), DARK, Enum.Material.Metal)
	end
	local beam = part(model, Vector3.new(1.4, 1.2, 8), plotCF * CFrame.new(x, 7.4, z), item.Color, Enum.Material.Neon)
	local zone = part(model, Vector3.new(1.2, 3.6, 5), plotCF * CFrame.new(x, 2.8, z), item.Color, Enum.Material.Neon, {
		Transparency = 0.6,
		CanCollide = false,
		CanQuery = false,
	})
	zone.Name = "Zone"
	Builders.Billboard(beam, item.Name .. "  x" .. item.Mult, item.Color, 2.5, 9, 60)

	model.Parent = parent
	return model, zone
end

------------------------------------------------------------------------
-- Bikes for the showroom (built from parts, pointing along local +X)
------------------------------------------------------------------------

function Builders.Bike(parent: Instance, base: CFrame, color: Color3): Model
	local bike = Instance.new("Model")
	bike.Name = "Bike"
	local function at(x: number, y: number, zz: number, rot: number?): CFrame
		return base * CFrame.new(x, y, zz) * CFrame.Angles(0, 0, math.rad(rot or 0))
	end

	for _, wx in { -2.6, 2.6 } do
		cylinder(bike, 0.7, 3, at(wx, 1.5, 0) * SIDEWAYS, Color3.fromRGB(25, 25, 25))
		cylinder(bike, 0.8, 1.1, at(wx, 1.5, 0) * SIDEWAYS, STEEL, Enum.Material.Metal)
	end
	part(bike, Vector3.new(3.4, 0.45, 0.4), at(-0.9, 2.7, 0, -8), color) -- top frame
	part(bike, Vector3.new(0.45, 2.4, 0.4), at(1.1, 2.3, 0, -28), color) -- down tube
	part(bike, Vector3.new(2.8, 0.3, 0.3), at(-1.5, 1.8, 0.35, 12), STEEL, Enum.Material.Metal) -- swingarm
	part(bike, Vector3.new(1.6, 1.3, 0.9), at(0, 2.0, 0), Color3.fromRGB(60, 60, 65), Enum.Material.Metal) -- engine
	part(bike, Vector3.new(1.6, 0.8, 1.1), at(0.7, 3.3, 0), color) -- tank
	part(bike, Vector3.new(2.4, 0.35, 0.9), at(-1.0, 3.4, 0), Color3.fromRGB(20, 20, 20)) -- seat
	part(bike, Vector3.new(2.0, 0.25, 0.8), at(-2.7, 3.4, 0, 12), color) -- rear fender
	for _, side in { -0.45, 0.45 } do
		part(bike, Vector3.new(0.3, 3.2, 0.3), at(2.3, 3.0, side, -18), STEEL, Enum.Material.Metal) -- fork
	end
	part(bike, Vector3.new(0.3, 0.3, 2.6), at(1.9, 4.7, 0), Color3.fromRGB(20, 20, 20)) -- handlebar
	part(bike, Vector3.new(1.4, 0.2, 0.7), at(2.8, 3.3, 0, -10), color) -- front fender
	part(bike, Vector3.new(0.2, 1.1, 1.2), at(2.45, 4.0, 0, -18), WHITE) -- number plate
	cylinder(bike, 2.2, 0.45, at(-1.7, 2.6, 0.6, 15), STEEL, Enum.Material.Metal) -- exhaust

	bike.Parent = parent
	return bike
end

function Builders.Showroom(parent: Instance, plotCF: CFrame, item: any): Model
	local model = Instance.new("Model")
	model.Name = item.Id
	local podiumCF = plotCF * CFrame.new(item.X, 0.5, item.Z)

	cylinder(model, 1, 11, podiumCF * UPRIGHT, Color3.fromRGB(30, 30, 35), Enum.Material.Metal)
	cylinder(model, 1.05, 11.4, podiumCF * CFrame.new(0, -0.1, 0) * UPRIGHT, item.BikeColor, Enum.Material.Neon)
	local top = part(model, Vector3.new(1, 1, 1), podiumCF * CFrame.new(0, 0.6, 0), DARK, nil, { Transparency = 1, CanCollide = false })
	-- bikes stand at an angle so they look good from the entrance
	Builders.Bike(model, podiumCF * CFrame.new(0, 0.5, 0) * CFrame.Angles(0, math.rad(-35), 0), item.BikeColor)
	Builders.Billboard(top, item.Name:gsub("Showroom: ", "") .. "  +" .. Format.Money(item.PerSecond) .. "/s", WHITE, 7, 10, 70)

	model.Parent = parent
	return model
end

------------------------------------------------------------------------
-- Decorations and buildings
------------------------------------------------------------------------

local decor = {}

function decor.Walls(model: Model, plotCF: CFrame)
	local wall = Color3.fromRGB(205, 200, 190)
	part(model, Vector3.new(80, 12, 1), plotCF * CFrame.new(0, 6, 39.5), wall, Enum.Material.Brick)
	for _, side in { -1, 1 } do
		part(model, Vector3.new(1, 12, 80), plotCF * CFrame.new(side * 39.5, 6, 0), wall, Enum.Material.Brick)
		part(model, Vector3.new(28.5, 3, 1), plotCF * CFrame.new(side * 25.25, 1.5, -39.5), wall, Enum.Material.Brick)
		-- orange stripe along the top of the side walls
		part(model, Vector3.new(1.2, 0.8, 80), plotCF * CFrame.new(side * 39.5, 11.6, 0), Color3.fromRGB(255, 140, 0))
	end
	part(model, Vector3.new(80, 0.8, 1.2), plotCF * CFrame.new(0, 11.6, 39.5), Color3.fromRGB(255, 140, 0))
end

function decor.Lights(model: Model, plotCF: CFrame)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			local x, zz = sx * 36, sz * 36
			part(model, Vector3.new(0.8, 14, 0.8), plotCF * CFrame.new(x, 7, zz), DARK, Enum.Material.Metal)
			local lamp = part(model, Vector3.new(2.4, 1, 2.4), plotCF * CFrame.new(x, 14.5, zz), Color3.fromRGB(255, 230, 170), Enum.Material.Neon)
			local light = Instance.new("PointLight")
			light.Range = 34
			light.Brightness = 1.4
			light.Color = Color3.fromRGB(255, 225, 170)
			light.Parent = lamp
		end
	end
end

function decor.Roof(model: Model, plotCF: CFrame)
	part(model, Vector3.new(80, 1, 34), plotCF * CFrame.new(0, 18.5, 23), Color3.fromRGB(150, 200, 255), Enum.Material.Glass, {
		Transparency = 0.45,
	})
	for _, side in { -1, 1 } do
		part(model, Vector3.new(1.5, 18, 1.5), plotCF * CFrame.new(side * 39, 9, 6.5), DARK, Enum.Material.Metal)
	end
	part(model, Vector3.new(80, 1.2, 1.5), plotCF * CFrame.new(0, 18, 6.5), DARK, Enum.Material.Metal)
end

function decor.Sign(model: Model, plotCF: CFrame, ownerName: string)
	local board = part(model, Vector3.new(44, 8, 1), plotCF * CFrame.new(0, 24, 39.5), Color3.fromRGB(20, 20, 25), Enum.Material.Metal)
	Builders.SurfaceText(board, Enum.NormalId.Front, string.upper(ownerName) .. "'S MOTO EMPIRE", Color3.fromRGB(255, 160, 30))
	for _, y in { 19.8, 28.2 } do
		part(model, Vector3.new(44.6, 0.4, 1.2), plotCF * CFrame.new(0, y, 39.5), Color3.fromRGB(255, 120, 0), Enum.Material.Neon)
	end
	for _, side in { -1, 1 } do
		part(model, Vector3.new(0.4, 8.8, 1.2), plotCF * CFrame.new(side * 22.2, 24, 39.5), Color3.fromRGB(255, 120, 0), Enum.Material.Neon)
	end
end

function decor.Trophy(model: Model, plotCF: CFrame)
	local base = plotCF * CFrame.new(22, 0, -2)
	part(model, Vector3.new(4, 2, 4), base * CFrame.new(0, 1, 0), WHITE, Enum.Material.Marble)
	cylinder(model, 2.5, 0.8, base * CFrame.new(0, 3.25, 0) * UPRIGHT, GOLD, Enum.Material.Foil)
	cylinder(model, 0.5, 2.6, base * CFrame.new(0, 4.6, 0) * UPRIGHT, GOLD, Enum.Material.Foil)
	local cup = part(model, Vector3.new(3.2, 3.2, 3.2), base * CFrame.new(0, 6.2, 0), GOLD, Enum.Material.Foil)
	cup.Shape = Enum.PartType.Ball
	for _, side in { -1, 1 } do
		cylinder(model, 0.5, 1.6, base * CFrame.new(side * 1.9, 6.4, 0) * SIDEWAYS, GOLD, Enum.Material.Foil)
	end
	local sparkles = Instance.new("Sparkles")
	sparkles.SparkleColor = GOLD
	sparkles.Parent = cup
	Builders.Billboard(cup, "🏆 READY TO REBIRTH?", GOLD, 4, 12, 80)
end

function Builders.Decor(parent: Instance, plotCF: CFrame, item: any, ownerName: string): Model
	local model = Instance.new("Model")
	model.Name = item.Id
	local builder = decor[item.Style]
	if builder then
		builder(model, plotCF, ownerName)
	else
		warn("[Builders] unknown decor style " .. tostring(item.Style))
	end
	model.Parent = parent
	return model
end

return Builders
