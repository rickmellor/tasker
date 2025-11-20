# VSCode Configuration

This folder contains VSCode-specific configurations for the Tasker project.

## Launch Configurations

Press `F5` or go to **Run and Debug** (Ctrl+Shift+D) to access these configurations:

### 1. Run Electron App
- **Purpose**: Quick launch of the app with DevTools enabled
- **Usage**: Select this config and press F5
- **Opens**: Electron app with DevTools automatically opened

### 2. Debug Electron Main Process
- **Purpose**: Debug the main process (main.js) with breakpoints
- **Usage**: Set breakpoints in `src/main.js` and press F5
- **Debugs**: Main process logic, IPC handlers, window management

### 3. Debug Electron Renderer Process
- **Purpose**: Debug the renderer process (renderer.js, HTML, CSS)
- **Usage**: First start "Debug Electron Main Process", then start this
- **Debugs**: Frontend logic, UI interactions, DOM manipulation

### 4. Debug Electron (Main + Renderer)
- **Purpose**: Debug both processes simultaneously
- **Usage**: Select this compound config and press F5
- **Debugs**: Full application debugging

## Tasks

Access tasks via **Terminal > Run Task** or `Ctrl+Shift+P` → "Tasks: Run Task":

- **npm: install** - Install dependencies
- **npm: dev** - Run app in development mode
- **npm: build** - Build for all platforms
- **npm: build:win** - Build for Windows only
- **npm: build:mac** - Build for MacOS only

## Quick Start

1. Make sure dependencies are installed: `npm install`
2. Press `F5` to launch the app
3. Or use `Ctrl+Shift+D` to open Run and Debug panel

## Tips

- Set breakpoints by clicking in the gutter (left of line numbers)
- Use `debugger;` statement in code for programmatic breakpoints
- Check the Debug Console for console.log output
- Renderer debugging requires Chrome DevTools knowledge
