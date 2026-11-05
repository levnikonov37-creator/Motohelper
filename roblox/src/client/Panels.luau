--[[
	Panels — Shop, Rebirth, Daily reward and Codes windows.
]]

local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Format = require(ReplicatedStorage.Shared:WaitForChild("Format"))
local Gui = require(script.Parent.Gui)

local Theme = Gui.Theme
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Panels = {}

local priceCache: { [string]: string } = {}

-- "R$ 199" for a pass/product, fetched once from Roblox.
local function fetchPrice(kind: "Pass" | "Product", id: number, onPrice: (string) -> ())
	if id == 0 then
		onPrice("SOON")
		return
	end
	local cacheKey = kind .. id
	if priceCache[cacheKey] then
		onPrice(priceCache[cacheKey])
		return
	end
	task.spawn(function()
		local ok, info = pcall(function()
			return MarketplaceService:GetProductInfo(id, if kind == "Pass" then Enum.InfoType.GamePass else Enum.InfoType.Product)
		end)
		local text = if ok and info and info.PriceInRobux then "R$ " .. info.PriceInRobux else "BUY"
		priceCache[cacheKey] = text
		onPrice(text)
	end)
end

local function incomeReward(player: Player, minutes: number, minimum: number): number
	local perSecond = player:GetAttribute("IncomePerSec") or 0
	return math.floor(math.max(minimum, perSecond * 60 * minutes))
end

local function sectionTitle(parent: Instance, text: string, order: number)
	Gui.label({
		LayoutOrder = order,
		Size = UDim2.new(1, 0, 0, 30),
		Font = Theme.FontHeavy,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextColor3 = Theme.Gold,
		Text = text,
		MaxTextSize = 22,
		Parent = parent,
	})
end

local function grid(parent: Instance, order: number): Frame
	return Gui.new("Frame", {
		LayoutOrder = order,
		Size = UDim2.new(1, -8, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundTransparency = 1,
		Parent = parent,
	}, {
		Gui.new("UIGridLayout", {
			CellSize = UDim2.new(0.5, -6, 0, 128),
			CellPadding = UDim2.fromOffset(10, 10),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
end

-- One shop card. Returns the description label and the buy button so callers can update them.
local function card(parent: Instance, order: number, icon: string, title: string, description: string, accent: Color3, onBuy: () -> ()): (TextLabel, TextButton)
	local frame = Gui.new("Frame", {
		LayoutOrder = order,
		BackgroundColor3 = Theme.Card,
		Parent = parent,
	}, { Gui.corner(14), Gui.stroke(accent, 2) })
	Gui.label({
		Position = UDim2.fromOffset(8, 8),
		Size = UDim2.fromOffset(46, 46),
		Text = icon,
		MaxTextSize = 40,
		Parent = frame,
	})
	Gui.label({
		Position = UDim2.fromOffset(60, 8),
		Size = UDim2.new(1, -68, 0, 26),
		Font = Theme.FontHeavy,
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = title,
		MaxTextSize = 22,
		Parent = frame,
	})
	local descriptionLabel = Gui.label({
		Position = UDim2.fromOffset(60, 34),
		Size = UDim2.new(1, -68, 0, 40),
		Font = Theme.Font,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextColor3 = Theme.Muted,
		TextWrapped = true,
		Text = description,
		MaxTextSize = 15,
		Parent = frame,
	})
	local buy = Gui.button("...", Theme.Green, {
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -8, 1, -8),
		Size = UDim2.new(0.6, 0, 0, 38),
		MaxTextSize = 20,
		Parent = frame,
	}, onBuy)
	return descriptionLabel, buy
end

------------------------------------------------------------------------
-- Shop
------------------------------------------------------------------------

local function buildShop(hud: any, player: Player)
	local content = hud:CreatePanel("Shop", "🛒  SHOP", Theme.Accent)
	local scroll = Gui.new("ScrollingFrame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 6,
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		Parent = content,
	}, {
		Gui.new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }),
	})

	-- Cash & boosts first: they are the impulse buys
	sectionTitle(scroll, "CASH & BOOSTS", 1)
	local productGrid = grid(scroll, 2)
	for order, key in Config.ProductOrder do
		local product = Config.Products[key]
		local description, buy = card(productGrid, order, product.Icon, product.Name, "", Theme.Green, function()
			hud:PromptPurchase("Product", key)
		end)
		fetchPrice("Product", product.Id, function(text)
			buy.Text = text
		end)
		local function refresh()
			if product.Kind == "Cash" then
				description.Text = "Get " .. Format.Money(incomeReward(player, product.Minutes, product.Min)) .. " instantly"
			else
				description.Text = "Double ALL cash for " .. Format.Time(product.Seconds) .. ". Stacks!"
			end
		end
		refresh()
		player:GetAttributeChangedSignal("IncomePerSec"):Connect(refresh)
	end

	sectionTitle(scroll, "GAME PASSES — FOREVER", 3)
	local passGrid = grid(scroll, 4)
	for order, key in Config.GamePassOrder do
		local pass = Config.GamePasses[key]
		local _, buy = card(passGrid, order, pass.Icon, pass.Name, pass.Description, Theme.Gold, function()
			if not player:GetAttribute("Pass_" .. key) then
				hud:PromptPurchase("Pass", key)
			end
		end)
		local function refresh()
			if player:GetAttribute("Pass_" .. key) then
				buy.Text = "OWNED ✓"
				buy.BackgroundColor3 = Theme.Card
				buy.AutoButtonColor = false
			else
				fetchPrice("Pass", pass.Id, function(text)
					if not player:GetAttribute("Pass_" .. key) then
						buy.Text = text
					end
				end)
			end
		end
		refresh()
		player:GetAttributeChangedSignal("Pass_" .. key):Connect(refresh)
	end

	-- Roblox Premium: +10% cash here, and Premium playtime pays the creator (Premium Payouts)
	if player.MembershipType ~= Enum.MembershipType.Premium then
		sectionTitle(scroll, "ROBLOX PREMIUM", 5)
		local premiumGrid = grid(scroll, 6)
		local _, buy = card(premiumGrid, 1, "⭐", "Premium Bonus", "Premium members earn +10% cash in this game.", Theme.Blue, function()
			MarketplaceService:PromptPremiumPurchase(player)
		end)
		buy.Text = "GET PREMIUM"
	end
end

------------------------------------------------------------------------
-- Rebirth
------------------------------------------------------------------------

local function buildRebirth(hud: any, player: Player)
	local content = hud:CreatePanel("Rebirth", "♻  REBIRTH", Theme.Purple)
	Gui.new("UIListLayout", {
		Padding = UDim.new(0, 10),
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		SortOrder = Enum.SortOrder.LayoutOrder,
		Parent = content,
	})

	local bonus = Gui.label({ LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 40), Font = Theme.FontHeavy, MaxTextSize = 30, Parent = content })
	local count = Gui.label({ LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 24), TextColor3 = Theme.Muted, MaxTextSize = 20, Parent = content })
	local cost = Gui.label({ LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 28), TextColor3 = Theme.Gold, MaxTextSize = 24, Parent = content })

	local bar = Gui.new("Frame", {
		LayoutOrder = 4,
		Size = UDim2.new(0.9, 0, 0, 26),
		BackgroundColor3 = Theme.Background,
		Parent = content,
	}, { Gui.corner(13) })
	local fill = Gui.new("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = Theme.Purple, Parent = bar }, { Gui.corner(13) })
	local percent = Gui.label({ Size = UDim2.fromScale(1, 1), MaxTextSize = 18, ZIndex = 2, Parent = bar })

	Gui.label({
		LayoutOrder = 5,
		Size = UDim2.new(1, 0, 0, 40),
		Font = Theme.Font,
		TextColor3 = Theme.Muted,
		TextWrapped = true,
		Text = "Resets your cash and garage. You keep your rebirth bonus and game passes.",
		MaxTextSize = 16,
		Parent = content,
	})

	local button = Gui.button("REBIRTH", Theme.Purple, {
		LayoutOrder = 6,
		Size = UDim2.new(0.6, 0, 0, 52),
		MaxTextSize = 28,
		Parent = content,
	}, function()
		local ok, response = pcall(function()
			return (Remotes:WaitForChild("Rebirth") :: RemoteFunction):InvokeServer()
		end)
		if ok and type(response) == "table" then
			hud:Toast(response.message, if response.ok then Theme.Gold else Theme.Red)
			if response.ok then
				hud:Close()
			end
		end
	end)

	local tip = Gui.button("💡 2x Cash pass = rebirth twice as fast", Theme.Card, {
		LayoutOrder = 7,
		Size = UDim2.new(0.9, 0, 0, 34),
		MaxTextSize = 16,
		Parent = content,
	}, function()
		hud:Open("Shop")
	end)

	local function refresh()
		local rebirths = player:GetAttribute("Rebirths") or 0
		local cash = player:GetAttribute("Cash") or 0
		local needed = Config.RebirthCost(rebirths)
		local progress = math.clamp(cash / needed, 0, 1)
		bonus.Text = "Cash bonus  x" .. Config.RebirthMultiplier(rebirths) .. "  →  x" .. Config.RebirthMultiplier(rebirths + 1)
		count.Text = "Rebirths: " .. rebirths
		cost.Text = "Cost: " .. Format.Money(needed)
		fill.Size = UDim2.fromScale(progress, 1)
		percent.Text = math.floor(progress * 100) .. "%"
		button.BackgroundColor3 = if progress >= 1 then Theme.Green else Theme.Card
		tip.Visible = not player:GetAttribute("Pass_DoubleCash")
		hud:SetBadge("Rebirth", progress >= 1)
	end
	for _, attribute in { "Rebirths", "Cash", "Pass_DoubleCash" } do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	refresh()
end

------------------------------------------------------------------------
-- Daily reward
------------------------------------------------------------------------

local function buildDaily(hud: any, player: Player)
	local content = hud:CreatePanel("Daily", "🎁  DAILY REWARD", Theme.Green)
	local days = #Config.Daily.Minutes

	local row = Gui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 120),
		BackgroundTransparency = 1,
		Parent = content,
	}, {
		Gui.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			Padding = UDim.new(0, 6),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	local tiles = {}
	for day = 1, days do
		local tile = Gui.new("Frame", {
			LayoutOrder = day,
			Size = UDim2.new(1 / days, -6, 1, 0),
			BackgroundColor3 = Theme.Card,
			Parent = row,
		}, { Gui.corner(12) })
		local stroke = Gui.stroke(Theme.Gold, 0)
		stroke.Parent = tile
		Gui.label({ Position = UDim2.fromScale(0, 0.05), Size = UDim2.fromScale(1, 0.25), Text = "Day " .. day, MaxTextSize = 16, Parent = tile })
		Gui.label({ Position = UDim2.fromScale(0, 0.3), Size = UDim2.fromScale(1, 0.35), Text = if day == days then "💎" else "💰", MaxTextSize = 30, Parent = tile })
		local amount = Gui.label({ Position = UDim2.fromScale(0.05, 0.7), Size = UDim2.fromScale(0.9, 0.22), TextColor3 = Theme.Green, MaxTextSize = 15, Parent = tile })
		tiles[day] = { Frame = tile, Stroke = stroke, Amount = amount }
	end

	local status = Gui.label({
		Position = UDim2.fromOffset(0, 140),
		Size = UDim2.new(1, 0, 0, 34),
		Font = Theme.FontHeavy,
		MaxTextSize = 26,
		Parent = content,
	})
	local claim = Gui.button("CLAIM", Theme.Green, {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 190),
		Size = UDim2.new(0.55, 0, 0, 54),
		MaxTextSize = 28,
		Parent = content,
	}, function()
		local ok, response = pcall(function()
			return (Remotes:WaitForChild("ClaimDaily") :: RemoteFunction):InvokeServer()
		end)
		if ok and type(response) == "table" then
			hud:Toast(response.message, if response.ok then Theme.Gold else Theme.Red)
		end
	end)
	Gui.label({
		Position = UDim2.fromOffset(0, 260),
		Size = UDim2.new(1, 0, 0, 40),
		Font = Theme.Font,
		TextColor3 = Theme.Muted,
		TextWrapped = true,
		Text = "Come back every day — rewards grow for 7 days in a row. Miss two days and the streak resets.",
		MaxTextSize = 16,
		Parent = content,
	})

	local function nextDay(): (number, number)
		local last = player:GetAttribute("DailyLast") or 0
		local streak = player:GetAttribute("DailyStreak") or 0
		local since = Workspace:GetServerTimeNow() - last
		local day = if last == 0 or since > Config.Daily.StreakResetAfter then 1 else streak % days + 1
		return day, Config.Daily.Cooldown - since
	end

	task.spawn(function()
		while true do
			if player:GetAttribute("DataLoaded") then
				local day, remaining = nextDay()
				local ready = remaining <= 0
				for index, tile in tiles do
					tile.Stroke.Thickness = if index == day then 3 else 0
					tile.Frame.BackgroundColor3 = if index == day and ready then Theme.Green else Theme.Card
					tile.Amount.Text = Format.Money(incomeReward(player, Config.Daily.Minutes[index], Config.Daily.MinCash[index]))
				end
				status.Text = if ready then "Your reward is ready!" else "Next reward in " .. Format.Time(remaining)
				claim.BackgroundColor3 = if ready then Theme.Green else Theme.Card
				hud:SetBadge("Daily", ready)
			end
			task.wait(1)
		end
	end)
end

------------------------------------------------------------------------
-- Codes
------------------------------------------------------------------------

local function buildCodes(hud: any)
	local content = hud:CreatePanel("Codes", "🎟  CODES", Theme.Blue)
	Gui.label({
		Size = UDim2.new(1, 0, 0, 50),
		Font = Theme.Font,
		TextColor3 = Theme.Muted,
		TextWrapped = true,
		Text = "Join our Roblox group and follow our socials for new codes!",
		MaxTextSize = 18,
		Parent = content,
	})
	local box = Gui.new("TextBox", {
		Position = UDim2.fromOffset(0, 70),
		Size = UDim2.new(1, 0, 0, 56),
		BackgroundColor3 = Theme.Background,
		Font = Theme.FontHeavy,
		PlaceholderText = "Enter code",
		PlaceholderColor3 = Theme.Muted,
		Text = "",
		TextColor3 = Theme.Text,
		TextScaled = true,
		ClearTextOnFocus = false,
		Parent = content,
	}, { Gui.corner(12), Gui.stroke(Theme.Blue, 2), Gui.padding(10), Gui.new("UITextSizeConstraint", { MaxTextSize = 28 }) })
	local result = Gui.label({
		Position = UDim2.fromOffset(0, 210),
		Size = UDim2.new(1, 0, 0, 30),
		Text = "",
		MaxTextSize = 20,
		Parent = content,
	})
	Gui.button("REDEEM", Theme.Blue, {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 140),
		Size = UDim2.new(0.5, 0, 0, 52),
		MaxTextSize = 26,
		Parent = content,
	}, function()
		local ok, response = pcall(function()
			return (Remotes:WaitForChild("RedeemCode") :: RemoteFunction):InvokeServer(box.Text)
		end)
		if ok and type(response) == "table" then
			result.Text = response.message
			result.TextColor3 = if response.ok then Theme.Green else Theme.Red
			if response.ok then
				box.Text = ""
				hud:Toast(response.message, Theme.Gold)
			end
		end
	end)
end

function Panels.Build(hud: any, player: Player)
	hud:AddMenuButton("Shop", "🛒", "SHOP", Theme.Accent, 1)
	hud:AddMenuButton("Rebirth", "♻️", "REBIRTH", Theme.Purple, 2)
	hud:AddMenuButton("Daily", "🎁", "DAILY", Theme.Green, 3)
	hud:AddMenuButton("Codes", "🎟️", "CODES", Theme.Blue, 4)

	buildShop(hud, player)
	buildRebirth(hud, player)
	buildDaily(hud, player)
	buildCodes(hud)
end

return Panels
