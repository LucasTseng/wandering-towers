# Wandering Towers (巫师飞塔)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is a digital implementation of the board game "Wandering Towers". It features a robust, event-sourced game engine and a modern, component-based UI built with React.

This project was developed with the assistance of a world-class AI software engineering assistant.

## ✨ Features

- **Event-Sourced Game Engine**: All game logic is built on an event-sourcing architecture, ensuring state changes are predictable, auditable, and easy to debug.
- **Complete Standard Spell System**: Implements all 7 standard spells with a flexible, three-tiered architecture (Validate, Resolve, Apply).
- **Configurable Gameplay**: Supports multiple spell-enabling modes (`BASIC`, `FIXED`, `RANDOM`) for varied gameplay.
- **Component-Based UI**: The user interface is built with React, featuring a clear separation between "smart" container components and "dumb" presentational components.
- **Reactive State Management**: A custom `useGame` hook cleanly connects the UI to the game engine, providing a reactive and efficient state management solution.
- **Comprehensive Test Coverage**: The core engine logic is covered by an extensive suite of unit tests, ensuring reliability.
- **Local Multiplayer**: Designed for a "hot-seat" experience where a single user controls all players, perfect for local play.

## 🛠️ Tech Stack

- **Language**: TypeScript
- **Monorepo Management**: pnpm Workspaces
- **Game Engine**: Plain TypeScript, no external dependencies
- **UI Framework**: React
- **Testing**: Vitest
- **Linting**: ESLint

## 📂 Project Structure

The project is organized as a monorepo with the following packages:

```
packages/
├── engine/       # The core game logic, rules, and state machine.
├── shared/       # Shared types, enums, and interfaces used across packages.
├── ui/           # The React component library, hooks, and main game screen.
├── client/       # The runnable web application that integrates the UI and engine.
└── server/       # (Placeholder for future multiplayer features).
```

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine.

### Prerequisites

- Node.js (v18.x or later recommended)
- pnpm package manager

### 1. Installation

Clone the repository and install the dependencies from the root directory:

```bash
git clone <repository-url>
cd wandering-towers
pnpm install
```

### 2. Running the Application

To start the development server for the web client, run the following command. This will launch the game in your browser.

```bash
pnpm --filter client dev
```

### 3. Running Tests

To run the entire test suite for the game engine, use:

```bash
pnpm test
```

### 4. Linting

To check the code for style and quality issues, run:

```bash
pnpm lint
```