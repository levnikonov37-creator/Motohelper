-- Number and time formatting shared by server and client.

local Format = {}

local SUFFIXES = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc" }

local function trimZeros(text: string): string
	if string.find(text, ".", 1, true) then
		text = (string.gsub(text, "0+$", ""))
		text = (string.gsub(text, "%.$", ""))
	end
	return text
end

-- 1234 -> "1.23K", 15500000 -> "15.5M"
function Format.Number(value: number): string
	if value ~= value or value == math.huge or value == -math.huge then
		return "0"
	end
	local negative = value < 0
	value = math.abs(value)

	local index = 1
	while value >= 1000 and index < #SUFFIXES do
		value /= 1000
		index += 1
	end

	local text
	if index == 1 or value >= 100 then
		text = tostring(math.floor(value))
	elseif value >= 10 then
		text = trimZeros(string.format("%.1f", math.floor(value * 10) / 10))
	else
		text = trimZeros(string.format("%.2f", math.floor(value * 100) / 100))
	end

	return (if negative then "-" else "") .. text .. SUFFIXES[index]
end

function Format.Money(value: number): string
	return "$" .. Format.Number(value)
end

-- 3725 -> "1h 02m", 125 -> "2m 05s", 9 -> "9s"
function Format.Time(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	local hours = math.floor(seconds / 3600)
	local minutes = math.floor((seconds % 3600) / 60)
	local secs = seconds % 60
	if hours > 0 then
		return string.format("%dh %02dm", hours, minutes)
	elseif minutes > 0 then
		return string.format("%dm %02ds", minutes, secs)
	end
	return string.format("%ds", secs)
end

return Format
