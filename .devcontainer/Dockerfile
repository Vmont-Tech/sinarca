# syntax=docker/dockerfile:1
FROM rust:1.95-bullseye

# Toolchain C/C++ (linker cc) + build tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential clang llvm-dev \
  && rm -rf /var/lib/apt/lists/*

# Targetar WASM
RUN rustup target add wasm32-unknown-unknown

# Dev convenience
RUN cargo --version && rustc --version
