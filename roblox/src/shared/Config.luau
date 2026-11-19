--[[
	Moto Empire Tycoon — all game settings live here.

	Everything you will want to tweak is in this file:
	  * Game Pass and Developer Product IDs (create them on create.roblox.com, paste IDs here)
	  * prices, income, rebirth cost
	  * daily rewards and promo codes

	The server and the client both read this module, so never put secrets here.
]]

local Config = {}

-- Bump this to start everyone from scratch (new DataStore). Normally never change it.
Config.DataStoreName = "MotoEmpire_v1"
Config.LeaderboardStoreName = "MotoEmpire_TotalEarned_v1"

------------------------------------------------------------------------
-- MONETIZATION
-- Id = 0 means "not created yet": the shop shows the item as unavailable.
------------------------------------------------------------------------

-- Game Passes: bought once, owned forever.
Config.GamePasses = {
	DoubleCash = {
		Id = 0,
		Name = "2x Cash",
		Icon = "💰",
		Description = "Double ALL cash you earn. Forever.",
	},
	AutoCollect = {
		Id = 0,
		Name = "Auto Collect",
		Icon = "🧲",
		Description = "Cash goes straight to your wallet. No more running to the pad.",
	},
	TurboDroppers = {
		Id = 0,
		Name = "Turbo Factory",
		Icon = "⚡",
		Description = "All machines work 1.5x faster.",
	},
	VIP = {
		Id = 0,
		Name = "VIP",
		Icon = "👑",
		Description = "+25% cash, golden [VIP] chat tag.",
	},
}
Config.GamePassOrder = { "DoubleCash", "AutoCollect", "TurboDroppers", "VIP" }

-- Developer Products: can be bought again and again.
-- Cash packs scale with the player's income so they stay useful at every stage:
-- reward = max(Min, income per second * 60 * Minutes)
Config.Products = {
	CashSmall = {
		Id = 0,
		Kind = "Cash",
		Name = "Bag of Cash",
		Icon = "💵",
		Minutes = 15,
		Min = 2500,
	},
	CashMedium = {
		Id = 0,
		Kind = "Cash",
		Name = "Case of Cash",
		Icon = "💼",
		Minutes = 60,
		Min = 15000,
	},
	CashLarge = {
		Id = 0,
		Kind = "Cash",
		Name = "Truck of Cash",
		Icon = "🚚",
		Minutes = 300,
		Min = 100000,
	},
	Boost = {
		Id = 0,
		Kind = "Boost",
		Name = "2x Boost (15 min)",
		Icon = "🔥",
		Seconds = 15 * 60,
	},
}
Config.ProductOrder = { "Boost", "CashSmall", "CashMedium", "CashLarge" }

Config.Multipliers = {
	DoubleCash = 2,
	VIP = 1.25,
	Premium = 1.1, -- Roblox Premium members (also raises your Premium Payouts)
	Boost = 2,
	TurboSpeed = 1.5, -- machine speed with the Turbo Factory pass
}

------------------------------------------------------------------------
-- REBIRTH
------------------------------------------------------------------------
Config.Rebirth = {
	BaseCost = 750000,
	Growth = 1.45, -- every rebirth costs 45% more
	BonusPerRebirth = 0.5, -- +50% cash per rebirth
}

function Config.RebirthCost(rebirths: number): number
	return math.floor(Config.Rebirth.BaseCost * Config.Rebirth.Growth ^ rebirths)
end

function Config.RebirthMultiplier(rebirths: number): number
	return 1 + Config.Rebirth.BonusPerRebirth * rebirths
end

------------------------------------------------------------------------
-- DAILY REWARD (7-day streak, then repeats)
-- reward = max(MinCash[day], income per second * 60 * Minutes[day])
------------------------------------------------------------------------
Config.Daily = {
	Cooldown = 20 * 60 * 60, -- can claim again after 20 hours
	StreakResetAfter = 48 * 60 * 60, -- miss 48 hours and the streak starts over
	Minutes = { 5, 8, 12, 16, 20, 25, 40 },
	MinCash = { 200, 400, 800, 1500, 3000, 5000, 10000 },
}

------------------------------------------------------------------------
-- PROMO CODES (case-insensitive). Give them out in your group / Discord / TikTok.
------------------------------------------------------------------------
Config.Codes = {
	MOTO = { Minutes = 5, Min = 500 },
	RELEASE = { Minutes = 10, Min = 1000 },
	VROOM = { Minutes = 15, Min = 2500 },
}

------------------------------------------------------------------------
-- WORLD
------------------------------------------------------------------------
Config.PlotCount = 6 -- also set Max Players to 6 in Game Settings
Config.PlotSize = 80
Config.ConveyorZ = 18 -- local Z of the conveyor line inside a plot
Config.ConveyorSpeed = 9
Config.MaxDropsPerPlot = 70

------------------------------------------------------------------------
-- ITEMS — the buttons on each plot.
--   Kind = "Dropper"  : machine that drops parts on the belt (Value every Interval seconds)
--   Kind = "Upgrader" : gate over the belt that multiplies part value (Mult)
--   Kind = "Showroom" : bike on display, earns PerSecond passively
--   Kind = "Decor"    : buildings and decorations (Style decides what gets built)
--   Requires          : ids that must be bought first (the button appears after that)
--   Slot              : where the button sits (1..18, three rows of six at the front)
--   X / Z             : where the thing is built (local plot coordinates)
------------------------------------------------------------------------
Config.Items = {
	{ Id = "d1", Kind = "Dropper", Name = "Bolt Press", Price = 0, Requires = {}, Slot = 1,
		X = -30, Value = 2, Interval = 2, DropSize = 0.9, DropColor = Color3.fromRGB(190, 190, 200),
		Color = Color3.fromRGB(90, 160, 255) },
	{ Id = "d2", Kind = "Dropper", Name = "Spring Coiler", Price = 50, Requires = { "d1" }, Slot = 2,
		X = -24, Value = 6, Interval = 2, DropSize = 1, DropColor = Color3.fromRGB(120, 200, 120),
		Color = Color3.fromRGB(80, 200, 120) },
	{ Id = "walls", Kind = "Decor", Style = "Walls", Name = "Garage Walls", Price = 150, Requires = { "d1" }, Slot = 3 },
	{ Id = "u1", Kind = "Upgrader", Name = "Paint Booth", Price = 350, Requires = { "d2" }, Slot = 4,
		X = 8, Mult = 1.5, Color = Color3.fromRGB(255, 90, 160) },
	{ Id = "d3", Kind = "Dropper", Name = "Piston Lathe", Price = 700, Requires = { "d2" }, Slot = 5,
		X = -18, Value = 16, Interval = 2, DropSize = 1.1, DropColor = Color3.fromRGB(230, 200, 90),
		Color = Color3.fromRGB(255, 200, 60) },
	{ Id = "lights", Kind = "Decor", Style = "Lights", Name = "Garage Lights", Price = 1200, Requires = { "walls" }, Slot = 6 },
	{ Id = "d4", Kind = "Dropper", Name = "Wheel Forge", Price = 2500, Requires = { "d3" }, Slot = 7,
		X = -12, Value = 40, Interval = 2, DropSize = 1.3, DropColor = Color3.fromRGB(40, 40, 45),
		Color = Color3.fromRGB(255, 140, 0) },
	{ Id = "sr1", Kind = "Showroom", Name = "Showroom: Pit Bike", Price = 5000, Requires = { "d4" }, Slot = 8,
		X = -26, Z = 0, PerSecond = 12, BikeColor = Color3.fromRGB(255, 120, 0) },
	{ Id = "u2", Kind = "Upgrader", Name = "Tuning Bench", Price = 10000, Requires = { "u1", "d4" }, Slot = 9,
		X = 14, Mult = 2, Color = Color3.fromRGB(0, 220, 255) },
	{ Id = "d5", Kind = "Dropper", Name = "Engine Caster", Price = 20000, Requires = { "d4" }, Slot = 10,
		X = -6, Value = 100, Interval = 2.5, DropSize = 1.5, DropColor = Color3.fromRGB(160, 160, 170),
		Color = Color3.fromRGB(200, 60, 60) },
	{ Id = "roof", Kind = "Decor", Style = "Roof", Name = "Factory Roof", Price = 35000, Requires = { "lights" }, Slot = 11 },
	{ Id = "sr2", Kind = "Showroom", Name = "Showroom: Enduro", Price = 60000, Requires = { "sr1" }, Slot = 12,
		X = -10, Z = 0, PerSecond = 45, BikeColor = Color3.fromRGB(30, 110, 255) },
	{ Id = "d6", Kind = "Dropper", Name = "Frame Welder", Price = 90000, Requires = { "d5" }, Slot = 13,
		X = 0, Value = 280, Interval = 2.5, DropSize = 1.7, DropColor = Color3.fromRGB(255, 80, 40),
		Color = Color3.fromRGB(150, 80, 255) },
	{ Id = "u3", Kind = "Upgrader", Name = "Chrome Plating", Price = 160000, Requires = { "u2" }, Slot = 14,
		X = 20, Mult = 2, Color = Color3.fromRGB(230, 230, 255) },
	{ Id = "sr3", Kind = "Showroom", Name = "Showroom: Rally Bike", Price = 260000, Requires = { "sr2" }, Slot = 15,
		X = 6, Z = 0, PerSecond = 140, BikeColor = Color3.fromRGB(220, 20, 40) },
	{ Id = "sign", Kind = "Decor", Style = "Sign", Name = "Neon Empire Sign", Price = 350000, Requires = { "roof" }, Slot = 16 },
	{ Id = "trophy", Kind = "Decor", Style = "Trophy", Name = "Golden Trophy", Price = 500000,
		Requires = { "d6", "u3", "sr3" }, Slot = 17 },
}

Config.ItemsById = {}
for _, item in Config.Items do
	Config.ItemsById[item.Id] = item
end

-- Local position (on the plot floor) of a button slot. Front of the plot is local -Z.
function Config.ButtonPosition(slot: number): Vector3
	local index = slot - 1
	local column = index % 6
	local row = math.floor(index / 6)
	return Vector3.new(-30 + column * 12, 0, -20 - row * 7)
end

return Config
