# Makefile for Kessler Shield (Apple Silicon ARM64 Target)

.PHONY: all ingest cpp-build api frontend clean

PYTHON = python3
GO = go
NPM = npm

# Dynamic paths for Pybind11 and Python includes
PYBIND_INCLUDES = $(shell $(PYTHON) -m pybind11 --includes)
PY_SUFFIX = $(shell $(PYTHON)-config --extension-suffix)

all: cpp-build ingest api frontend

cpp-build:
	@echo "==> Compiling C++ Physics Engine (ARM64 Optimized)..."
	c++ -O3 -Wall -shared -std=c++17 -fPIC \
		-target arm64-apple-macos11 \
		$(PYBIND_INCLUDES) math_engine.cpp \
		-o math_engine$(PY_SUFFIX)
	@echo "C++ Module built successfully."

ingest:
	@echo "==> Running Go Telemetry Broker..."
	env GOARCH=arm64 $(GO) run main.go

api:
	@echo "==> Starting FastAPI Backend..."
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

frontend:
	@echo "==> Starting Next.js / React Frontend..."
	$(NPM) run dev

clean:
	rm -f kessler.db
	rm -f *.so
	pkill -f uvicorn || true