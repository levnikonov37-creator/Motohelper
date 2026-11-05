--[[
	Hud — the always-visible interface: money at the top, menu on the left,
	toasts, and the frame that panels (shop, rebirth, ...) open in.
]]

local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Format = require(ReplicatedStorage.Shared:WaitForChild("Format"))
local Gui = require(script.Parent.Gui)

local Theme = Gui.Theme

local Hud = {}
Hud.__index = Hud

export type Hud = typeof(setmetatable(
	{} :: {
		Player: Player,
		Gui: ScreenGui,
		Panels: { [string]: Frame },
		OpenPanel: string?,
		MenuButtons: { [string]: TextButton },
		Menu: Frame,
		Toasts: Frame,
		Scales: { UIScale },
	},
	Hud
))

local function fitScale(): number
	local camera = Workspace.CurrentCamera
	local viewport = if camera then camera.ViewportSize else Vector2.new(1280, 720)
	return math.clamp(math.min(viewport.X / 1150, viewport.Y / 680), 0.6, 1.15)
end

function Hud.new(player: Player): Hud
	local self = setmetatable({}, Hud) :: any
	self.Player = player
	self.Panels = {}
	self.OpenPanel = nil
	self.MenuButtons = {}
	self.Scales = {}

	self.Gui = Gui.new("ScreenGui", {
		Name = "MotoEmpireHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = player:WaitForChild("PlayerGui"),
	})

	self:_buildMoney()
	self:_buildMenu()
	self:_buildToasts()

	local function rescale()
		local scale = fitScale()
		for _, uiScale in self.Scales do
			uiScale.Scale = scale
		end
	end
	rescale()
	local camera = Workspace.CurrentCamera
	if camera then
		camera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
	end

	return self
end

function Hud._scaled(self: Hud, instance: GuiObject)
	table.insert(self.Scales, Gui.new("UIScale", { Parent = instance }))
end

------------------------------------------------------------------------
-- Money display
------------------------------------------------------------------------

function Hud._buildMoney(self: Hud)
	local player = self.Player
	local frame = Gui.new("Frame", {
		Name = "Money",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 6),
		Size = UDim2.fromOffset(300, 74),
		BackgroundColor3 = Theme.Background,
		BackgroundTransparency = 0.15,
		Parent = self.Gui,
	}, { Gui.corner(16), Gui.stroke(Theme.Accent, 2) })
	self:_scaled(frame)

	local cash = Gui.label({
		Name = "Cash",
		Position = UDim2.fromOffset(10, 4),
		Size = UDim2.new(1, -20, 0, 42),
		Font = Theme.FontHeavy,
		TextColor3 = Theme.Green,
		Text = "Loading...",
		MaxTextSize = 40,
		Parent = frame,
	})
	local income = Gui.label({
		Name = "Income",
		Position = UDim2.fromOffset(10, 46),
		Size = UDim2.new(1, -20, 0, 22),
		TextColor3 = Theme.Muted,
		Text = "",
		MaxTextSize = 18,
		Parent = frame,
	})

	-- "cash waiting at your pad" pill (also sells Auto Collect)
	local bank = Gui.new("TextButton", {
		Name = "Bank",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 86),
		Size = UDim2.fromOffset(300, 30),
		BackgroundColor3 = Theme.Card,
		BackgroundTransparency = 0.1,
		Font = Theme.Font,
		TextColor3 = Theme.Gold,
		TextScaled = true,
		Visible = false,
		Parent = self.Gui,
	}, { Gui.corner(12), Gui.new("UIPadding", { PaddingTop = UDim.new(0, 5), PaddingBottom = UDim.new(0, 5) }) })
	self:_scaled(bank)
	bank.Activated:Connect(function()
		self:Open("Shop")
	end)

	-- boost timer
	local boost = Gui.label({
		Name = "Boost",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(1, 8, 0.5, 0),
		Size = UDim2.fromOffset(120, 34),
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.Red,
		Font = Theme.FontHeavy,
		Text = "",
		Visible = false,
		MaxTextSize = 20,
		Parent = frame,
	})
	Gui.corner(10).Parent = boost

	local function refresh()
		if not player:GetAttribute("DataLoaded") then
			return
		end
		cash.Text = Format.Money(player:GetAttribute("Cash") or 0)
		local perSecond = player:GetAttribute("IncomePerSec") or 0
		local multiplier = player:GetAttribute("Multiplier") or 1
		income.Text = "+" .. Format.Money(perSecond) .. "/s   ·   x" .. Format.Number(math.floor(multiplier * 100) / 100) .. " bonus"

		local banked = player:GetAttribute("Bank") or 0
		if banked >= 1 and not player:GetAttribute("Pass_AutoCollect") then
			bank.Visible = true
			bank.Text = "🏦 " .. Format.Money(banked) .. " waiting on your green pad"
		else
			bank.Visible = false
		end
	end
	for _, attribute in { "Cash", "IncomePerSec", "Multiplier", "Bank", "Pass_AutoCollect", "DataLoaded" } do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	refresh()

	task.spawn(function()
		while true do
			local left = (player:GetAttribute("BoostEndsAt") or 0) - Workspace:GetServerTimeNow()
			boost.Visible = left > 0
			if left > 0 then
				boost.Text = "🔥 2x " .. Format.Time(left)
			end
			task.wait(1)
		end
	end)
end

------------------------------------------------------------------------
-- Left menu
------------------------------------------------------------------------

function Hud._buildMenu(self: Hud)
	local menu = Gui.new("Frame", {
		Name = "Menu",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 10, 0.5, 0),
		Size = UDim2.fromOffset(84, 4 * 90),
		BackgroundTransparency = 1,
		Parent = self.Gui,
	}, {
		Gui.new("UIListLayout", {
			Padding = UDim.new(0, 8),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	self:_scaled(menu)
	self.Menu = menu
end

function Hud.AddMenuButton(self: Hud, id: string, icon: string, text: string, color: Color3, order: number): TextButton
	local button = Gui.new("TextButton", {
		Name = id,
		LayoutOrder = order,
		Size = UDim2.fromOffset(82, 82),
		BackgroundColor3 = color,
		Text = "",
		AutoButtonColor = true,
		Parent = self.Menu,
	}, { Gui.corner(18), Gui.stroke(Color3.new(0, 0, 0), 3) })
	Gui.label({
		Position = UDim2.fromScale(0, 0.05),
		Size = UDim2.fromScale(1, 0.55),
		Text = icon,
		MaxTextSize = 40,
		Parent = button,
	})
	Gui.label({
		Position = UDim2.fromScale(0.05, 0.62),
		Size = UDim2.fromScale(0.9, 0.3),
		Font = Theme.FontHeavy,
		Text = text,
		MaxTextSize = 16,
		Parent = button,
	})
	local dot = Gui.new("Frame", {
		Name = "Dot",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(1, -6, 0, 6),
		Size = UDim2.fromOffset(20, 20),
		BackgroundColor3 = Theme.Red,
		Visible = false,
		Parent = button,
	}, { Gui.corner(10), Gui.stroke(Color3.new(1, 1, 1), 2) })
	dot.ZIndex = 3

	button.Activated:Connect(function()
		if self.OpenPanel == id then
			self:Close()
		else
			self:Open(id)
		end
	end)
	self.MenuButtons[id] = button
	return button
end

function Hud.SetBadge(self: Hud, id: string, visible: boolean)
	local button = self.MenuButtons[id]
	local dot = button and button:FindFirstChild("Dot")
	if dot then
		(dot :: Frame).Visible = visible
	end
end

------------------------------------------------------------------------
-- Panels
------------------------------------------------------------------------

-- Creates a hidden window and returns its content frame.
function Hud.CreatePanel(self: Hud, id: string, title: string, accent: Color3): Frame
	local panel = Gui.new("Frame", {
		Name = id,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.52),
		Size = UDim2.fromOffset(600, 440),
		BackgroundColor3 = Theme.Panel,
		Visible = false,
		Parent = self.Gui,
	}, { Gui.corner(18), Gui.stroke(accent, 3) })
	self:_scaled(panel)

	local header = Gui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 52),
		BackgroundColor3 = accent,
		Parent = panel,
	}, { Gui.corner(18) })
	-- square off the header's bottom corners
	Gui.new("Frame", {
		Position = UDim2.new(0, 0, 1, -18),
		Size = UDim2.new(1, 0, 0, 18),
		BackgroundColor3 = accent,
		BorderSizePixel = 0,
		Parent = header,
	})
	Gui.label({
		Position = UDim2.fromOffset(18, 8),
		Size = UDim2.new(1, -90, 0, 36),
		Font = Theme.FontHeavy,
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = title,
		MaxTextSize = 30,
		Parent = header,
	})
	Gui.button("X", Theme.Red, {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 8),
		Size = UDim2.fromOffset(40, 36),
		Parent = header,
	}, function()
		self:Close()
	end)

	local content = Gui.new("Frame", {
		Name = "Content",
		Position = UDim2.fromOffset(16, 64),
		Size = UDim2.new(1, -32, 1, -80),
		BackgroundTransparency = 1,
		Parent = panel,
	})
	self.Panels[id] = panel
	return content
end

function Hud.Open(self: Hud, id: string)
	for panelId, panel in self.Panels do
		panel.Visible = panelId == id
	end
	self.OpenPanel = id
	local panel = self.Panels[id]
	if panel then
		Gui.pop(panel)
	end
end

function Hud.Close(self: Hud)
	for _, panel in self.Panels do
		panel.Visible = false
	end
	self.OpenPanel = nil
end

------------------------------------------------------------------------
-- Toasts
------------------------------------------------------------------------

function Hud._buildToasts(self: Hud)
	local toasts = Gui.new("Frame", {
		Name = "Toasts",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 124),
		Size = UDim2.fromOffset(440, 300),
		BackgroundTransparency = 1,
		Parent = self.Gui,
	}, {
		Gui.new("UIListLayout", {
			Padding = UDim.new(0, 6),
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	self:_scaled(toasts)
	self.Toasts = toasts
end

local toastCount = 0

-- Shows a short message. `action` adds a button, e.g. { Text = "Get Cash", Callback = fn }.
function Hud.Toast(self: Hud, text: string, color: Color3?, action: { Text: string, Callback: () -> () }?)
	toastCount += 1
	local existing = {}
	for _, child in self.Toasts:GetChildren() do
		if child:IsA("Frame") then
			table.insert(existing, child)
		end
	end
	if #existing >= 4 then
		existing[1]:Destroy()
	end

	local toast = Gui.new("Frame", {
		LayoutOrder = toastCount,
		Size = UDim2.fromOffset(440, 44),
		BackgroundColor3 = Theme.Background,
		BackgroundTransparency = 0.1,
		Parent = self.Toasts,
	}, { Gui.corner(12), Gui.stroke(color or Theme.Accent, 2) })
	Gui.label({
		Position = UDim2.fromOffset(12, 6),
		Size = UDim2.new(1, if action then -150 else -24, 1, -12),
		TextColor3 = color or Theme.Text,
		Text = text,
		MaxTextSize = 20,
		Parent = toast,
	})
	if action then
		Gui.button(action.Text, Theme.Green, {
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -6, 0.5, 0),
			Size = UDim2.fromOffset(128, 34),
			MaxTextSize = 18,
			Parent = toast,
		}, function()
			action.Callback()
			toast:Destroy()
		end)
	end
	Gui.pop(toast)

	task.delay(if action then 5 else 3, function()
		if toast.Parent then
			local tween = TweenService:Create(toast, TweenInfo.new(0.3), { BackgroundTransparency = 1 })
			tween:Play()
			tween.Completed:Wait()
			toast:Destroy()
		end
	end)
end

-- Opens the Roblox purchase prompt for a pass or product from Config.
function Hud.PromptPurchase(self: Hud, kind: "Pass" | "Product", key: string)
	local entry = if kind == "Pass" then Config.GamePasses[key] else Config.Products[key]
	if not entry or entry.Id == 0 then
		self:Toast("Not on sale yet — the creator must add its ID in Config.", Theme.Red)
		return
	end
	if kind == "Pass" then
		MarketplaceService:PromptGamePassPurchase(self.Player, entry.Id)
	else
		MarketplaceService:PromptProductPurchase(self.Player, entry.Id)
	end
end

return Hud
