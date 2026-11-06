# make test  — проверка логики зажигания на компьютере (нужен только gcc)
# make avr   — сборка прошивки для Arduino Nano без Arduino IDE (avr-gcc + ядро Arduino AVR,
#              путь к ядру: ARDUINO_CORE=…/hardware/arduino/avr)

CC ?= cc
ARDUINO_CORE ?= /usr/share/arduino/hardware/arduino/avr

test: test/test_logic
	./test/test_logic

test/test_logic: test/test_logic.c sport_cdi/cdi_core.h sport_cdi/cdi_logic.h
	$(CC) -std=c99 -O2 -Wall -Wextra -Wno-unused-function -o $@ test/test_logic.c -lm

BUILD := build
MCU   := atmega328p
F_CPU := 16000000L
AVRFLAGS := -mmcu=$(MCU) -DF_CPU=$(F_CPU) -DARDUINO=10819 -DARDUINO_AVR_NANO -DARDUINO_ARCH_AVR \
	-Os -ffunction-sections -fdata-sections -flto -Wall \
	-I$(ARDUINO_CORE)/cores/arduino -I$(ARDUINO_CORE)/variants/eightanaloginputs \
	-I$(ARDUINO_CORE)/libraries/EEPROM/src
CXXFLAGS_AVR := -std=gnu++11 -fno-exceptions -fno-threadsafe-statics -fpermissive
CORE_DIR := $(ARDUINO_CORE)/cores/arduino
CORE_OBJ := $(patsubst $(CORE_DIR)/%,$(BUILD)/core/%.o,$(wildcard $(CORE_DIR)/*.c) $(wildcard $(CORE_DIR)/*.cpp))

avr: $(BUILD)/sport_cdi.hex

$(BUILD)/core/%.c.o: $(CORE_DIR)/%.c
	@mkdir -p $(BUILD)/core
	avr-gcc $(AVRFLAGS) -std=gnu11 -c $< -o $@

$(BUILD)/core/%.cpp.o: $(CORE_DIR)/%.cpp
	@mkdir -p $(BUILD)/core
	avr-g++ $(AVRFLAGS) $(CXXFLAGS_AVR) -c $< -o $@

$(BUILD)/sport_cdi.o: sport_cdi/sport_cdi.ino sport_cdi/cdi_core.h sport_cdi/cdi_logic.h
	@mkdir -p $(BUILD)
	printf '#include <Arduino.h>\n#line 1 "sport_cdi.ino"\n' > $(BUILD)/sport_cdi.cpp
	cat sport_cdi/sport_cdi.ino >> $(BUILD)/sport_cdi.cpp
	avr-g++ $(AVRFLAGS) $(CXXFLAGS_AVR) -Isport_cdi -c $(BUILD)/sport_cdi.cpp -o $@

# ядро — архивом, как в Arduino IDE: из него берётся только нужное (свои ISR(INT0/INT1) не конфликтуют)
$(BUILD)/core.a: $(CORE_OBJ)
	avr-gcc-ar rcs $@ $^

$(BUILD)/sport_cdi.hex: $(BUILD)/sport_cdi.o $(BUILD)/core.a
	avr-gcc $(AVRFLAGS) -Wl,--gc-sections -o $(BUILD)/sport_cdi.elf $(BUILD)/sport_cdi.o $(BUILD)/core.a -lm
	avr-objcopy -O ihex -R .eeprom $(BUILD)/sport_cdi.elf $@
	avr-size -C --mcu=$(MCU) $(BUILD)/sport_cdi.elf

# make sim — прогон собранной прошивки на эмуляторе ATmega328P (apt install simavr libsimavr-dev)
sim: avr test/sim_avr
	./test/sim_avr build/sport_cdi.elf

test/sim_avr: test/sim_avr.c
	$(CC) -O2 -Wall -o $@ test/sim_avr.c -lsimavr -lelf -lm

clean:
	rm -rf build test/test_logic

.PHONY: test avr sim clean
