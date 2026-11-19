--[[
	Moto Empire Tycoon — client entry point.
	Builds the HUD and shows server notifications as toasts.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Format = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Format"))
local ChatTags = require(script.Parent.ChatTags)
local Gui = require(script.Parent.Gui)
local Guide = require(script.Parent.Guide)
local Hud = require(script.Parent.Hud)
local Panels = require(script.Parent.Panels)

local player = Players.LocalPlayer
local Theme = Gui.Theme

local hud = Hud.new(player)
Panels.Build(hud, player)
Guide.Start(player)
ChatTags.Start()

local function openShop()
	hud:Open("Shop")
end

local handlers = {
	Bought = function(payload)
		hud:Toast("✅ Built " .. tostring(payload.Name) .. "!", Theme.Green)
	end,
	NeedCash = function(payload)
		hud:Toast("Need " .. Format.Money(payload.Missing or 0) .. " more", Theme.Red, { Text = "GET CASH", Callback = openShop })
	end,
	Collected = function(payload)
		hud:Toast("+" .. Format.Money(payload.Amount or 0) .. " collected", Theme.Green)
	end,
	Reward = function(payload)
		hud:Toast("🎉 " .. tostring(payload.Text), Theme.Gold)
	end,
	Rebirth = function(payload)
		hud:Toast("♻ Rebirth " .. tostring(payload.Rebirths) .. "! Cash bonus x" .. tostring(payload.Multiplier), Theme.Gold)
	end,
	Info = function(payload)
		hud:Toast(tostring(payload.Text), Theme.Text)
	end,
	Error = function(payload)
		hud:Toast(tostring(payload.Text), Theme.Red)
	end,
}

local Notify = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("Notify") :: RemoteEvent
Notify.OnClientEvent:Connect(function(kind, payload)
	local handler = handlers[kind]
	if handler and type(payload) == "table" then
		handler(payload)
	end
end)

-- first-time hint
task.delay(4, function()
	hud:Toast("Step on the green buttons in your garage to build your moto empire!", Theme.Accent)
end)
