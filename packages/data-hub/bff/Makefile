PORT ?= 4010

.PHONY: build run clean

build:
	go build -o bin/bff ./cmd/

run: build
	PORT=$(PORT) ./bin/bff

clean:
	rm -rf bin/
