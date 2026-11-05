-- Tiny UI toolkit: theme colours and helpers to build instances in code.

local TweenService = game:GetService("TweenService")

local Gui = {}

Gui.Theme = {
	Background = Color3.fromRGB(22, 24, 30),
	Panel = Color3.fromRGB(34, 37, 46),
	Card = Color3.fromRGB(46, 50, 62),
	Accent = Color3.fromRGB(255, 140, 0),
	Green = Color3.fromRGB(46, 204, 113),
	Red = Color3.fromRGB(235, 77, 75),
	Gold = Color3.fromRGB(255, 200, 40),
	Blue = Color3.fromRGB(52, 152, 219),
	Purple = Color3.fromRGB(155, 89, 182),
	Text = Color3.fromRGB(245, 245, 245),
	Muted = Color3.fromRGB(170, 175, 190),
	Font = Enum.Font.GothamBold,
	FontHeavy = Enum.Font.GothamBlack,
}

-- Gui.new("Frame", { Size = ..., Parent = ... }, { children })
function Gui.new(className: string, props: { [string]: any }?, children: { Instance }?): any
	local instance = Instance.new(className)
	local parent = nil
	if props then
		for key, value in props do
			if key == "Parent" then
				parent = value
			else
				(instance :: any)[key] = value
			end
		end
	end
	if children then
		for _, child in children do
			child.Parent = instance
		end
	end
	if parent then
		instance.Parent = parent
	end
	return instance
end

function Gui.corner(radius: number?): UICorner
	return Gui.new("UICorner", { CornerRadius = UDim.new(0, radius or 12) })
end

function Gui.stroke(color: Color3?, thickness: number?): UIStroke
	return Gui.new("UIStroke", {
		Color = color or Color3.new(0, 0, 0),
		Thickness = thickness or 2,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function Gui.padding(pixels: number): UIPadding
	local p = UDim.new(0, pixels)
	return Gui.new("UIPadding", { PaddingLeft = p, PaddingRight = p, PaddingTop = p, PaddingBottom = p })
end

function Gui.label(props: { [string]: any }): TextLabel
	local defaults = {
		BackgroundTransparency = 1,
		Font = Gui.Theme.Font,
		TextColor3 = Gui.Theme.Text,
		TextScaled = true,
	}
	for key, value in props do
		if key ~= "MaxTextSize" then
			defaults[key] = value
		end
	end
	local label = Gui.new("TextLabel", defaults)
	Gui.new("UITextSizeConstraint", { MaxTextSize = props.MaxTextSize or 28, Parent = label })
	return label
end

-- Button with a press animation. onClick runs when it is clicked/tapped.
function Gui.button(text: string, color: Color3, props: { [string]: any }, onClick: () -> ()): TextButton
	local defaults = {
		BackgroundColor3 = color,
		Font = Gui.Theme.FontHeavy,
		TextColor3 = Gui.Theme.Text,
		TextScaled = true,
		AutoButtonColor = true,
		Text = text,
	}
	for key, value in props do
		if key ~= "MaxTextSize" then
			defaults[key] = value
		end
	end
	local button = Gui.new("TextButton", defaults, {
		Gui.corner(10),
		Gui.stroke(Color3.new(0, 0, 0), 2),
		Gui.new("UITextSizeConstraint", { MaxTextSize = props.MaxTextSize or 24 }),
		Gui.new("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingBottom = UDim.new(0, 4) }),
	})
	local scale = Gui.new("UIScale", { Parent = button })
	button.MouseButton1Down:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.08), { Scale = 0.92 }):Play()
	end)
	button.MouseButton1Up:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.12, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end)
	button.MouseLeave:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1 }):Play()
	end)
	button.Activated:Connect(onClick)
	return button
end

function Gui.pop(instance: GuiObject)
	local scale = instance:FindFirstChildOfClass("UIScale") or Gui.new("UIScale", { Parent = instance })
	scale.Scale = 0.8
	TweenService:Create(scale, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = 1 }):Play()
end

return Gui
