--[[
	Guide — helps new players: buttons you can afford glow green, ones you
	can't are red, and a beam points from you to the next thing to buy.
]]

local Workspace = game:GetService("Workspace")

local Guide = {}

local AFFORD = Color3.fromRGB(46, 204, 113)
local TOO_EXPENSIVE = Color3.fromRGB(235, 77, 75)

function Guide.Start(player: Player)
	local beam: Beam? = nil
	local target: Attachment? = nil
	local watchedButtons: Folder? = nil

	local function getButtons(): Folder?
		local plotName = player:GetAttribute("Plot")
		local plots = Workspace:FindFirstChild("Plots")
		local plot = plotName and plots and plots:FindFirstChild(plotName)
		return plot and plot:FindFirstChild("Buttons") :: Folder?
	end

	local function ensureBeam(): Beam?
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if not root then
			return nil
		end
		if beam and beam.Parent == root then
			return beam
		end
		local origin = root:FindFirstChild("GuideOrigin") or Instance.new("Attachment")
		origin.Name = "GuideOrigin"
		origin.Parent = root
		local newBeam = Instance.new("Beam")
		newBeam.Name = "GuideBeam"
		newBeam.Attachment0 = origin :: Attachment
		newBeam.Color = ColorSequence.new(Color3.fromRGB(255, 160, 0), Color3.fromRGB(255, 230, 80))
		newBeam.Transparency = NumberSequence.new(0.15)
		newBeam.Width0 = 0.5
		newBeam.Width1 = 0.5
		newBeam.FaceCamera = true
		newBeam.LightEmission = 1
		newBeam.Segments = 2
		newBeam.Enabled = false
		newBeam.Parent = root
		beam = newBeam
		return newBeam
	end

	local function update()
		local buttons = getButtons()
		local cash = player:GetAttribute("Cash") or 0
		local cheapest: BasePart? = nil
		local cheapestPrice = math.huge

		if buttons then
			for _, pad in buttons:GetChildren() do
				if pad:IsA("BasePart") then
					local price = pad:GetAttribute("Price") or 0
					local affordable = price <= cash
					pad.Color = if affordable then AFFORD else TOO_EXPENSIVE
					local tag = pad:FindFirstChild("Tag")
					local priceLabel = tag and tag:FindFirstChild("Price")
					if priceLabel and priceLabel:IsA("TextLabel") then
						priceLabel.TextColor3 = if affordable then Color3.fromRGB(120, 255, 140) else Color3.fromRGB(255, 120, 120)
					end
					if price < cheapestPrice then
						cheapest = pad
						cheapestPrice = price
					end
				end
			end
		end

		local currentBeam = ensureBeam()
		if not currentBeam then
			return
		end
		if cheapest and cheapestPrice <= cash then
			if not target or target.Parent ~= cheapest then
				if target then
					target:Destroy()
				end
				local attachment = Instance.new("Attachment")
				attachment.Name = "GuideTarget"
				attachment.Position = Vector3.new(0, 0, 0)
				attachment.Parent = cheapest
				target = attachment
			end
			currentBeam.Attachment1 = target
			currentBeam.Enabled = true
		else
			currentBeam.Enabled = false
		end
	end

	-- re-run when the plot's buttons change
	local function watch()
		local buttons = getButtons()
		if buttons and buttons ~= watchedButtons then
			watchedButtons = buttons
			buttons.ChildAdded:Connect(function()
				task.defer(update)
			end)
			buttons.ChildRemoved:Connect(function()
				task.defer(update)
			end)
		end
		update()
	end

	player:GetAttributeChangedSignal("Plot"):Connect(watch)
	player:GetAttributeChangedSignal("Cash"):Connect(update)
	player.CharacterAdded:Connect(function(character)
		character:WaitForChild("HumanoidRootPart", 10)
		update()
	end)
	watch()
end

return Guide
