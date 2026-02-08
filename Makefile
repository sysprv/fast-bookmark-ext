SRC = manifest.json background.js content.js icons/ COPYING README.md

.PHONY: build xpi clean

build: fast-bookmark-ext.zip

xpi: fast-bookmark-ext.xpi

fast-bookmark-ext.zip: $(SRC)
	zip -r $@ $^

# XPI is just a zip with a different extension
fast-bookmark-ext.xpi: $(SRC)
	zip -r $@ $^

clean:
	rm -f fast-bookmark-ext.zip fast-bookmark-ext.xpi
