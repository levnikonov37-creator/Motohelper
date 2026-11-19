-- Golden [VIP] tag in chat for owners of the VIP game pass.

local Players = game:GetService("Players")
local TextChatService = game:GetService("TextChatService")

local ChatTags = {}

function ChatTags.Start()
	TextChatService.OnIncomingMessage = function(message: TextChatMessage)
		local properties = Instance.new("TextChatMessageProperties")
		local source = message.TextSource
		if source then
			local speaker = Players:GetPlayerByUserId(source.UserId)
			if speaker and speaker:GetAttribute("Pass_VIP") then
				properties.PrefixText = '<font color="#FFC828">[VIP]</font> ' .. message.PrefixText
			end
		end
		return properties
	end
end

return ChatTags
