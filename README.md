# Tasker

A cross-platform task management application built with Electron, designed for Windows and MacOS.

## Features

- Add, complete, and delete tasks
- Persistent storage using localStorage
- Clean, modern UI with gradient theme
- Cross-platform support (Windows & MacOS)
- Secure IPC communication
- Lightweight and fast

## Prerequisites

- Node.js (v16 or later recommended)
- npm (comes with Node.js)
- For building:
  - Windows: Any platform
  - MacOS: MacOS required for code signing

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tasker
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the application in development mode (with DevTools):

```bash
npm run dev
```

Or run without DevTools:

```bash
npm start
```

## Building

### Build for Windows

Creates NSIS installer and portable executable:

```bash
npm run build:win
```

Output:
- `dist/Tasker Setup X.X.X.exe` - NSIS installer (x64 and ia32)
- `dist/Tasker X.X.X.exe` - Portable executable (x64)

### Build for MacOS

Creates DMG and ZIP packages:

```bash
npm run build:mac
```

Output:
- `dist/Tasker-X.X.X.dmg` - DMG installer
- `dist/Tasker-X.X.X-mac.zip` - ZIP archive

### Build for All Platforms

```bash
npm run build:all
```

**Note**: MacOS builds are best done on MacOS for proper code signing.

## Project Structure

```
tasker/
├── .claude/              # Claude Code configuration
│   ├── claude.md         # Project memory and documentation
│   └── agents/           # Custom development agents
├── assets/               # Application icons
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure IPC bridge
│   ├── index.html       # Main UI
│   ├── styles.css       # Application styles
│   └── renderer.js      # Frontend logic
├── dist/                 # Build output (created during build)
├── package.json         # Project configuration
└── README.md           # This file
```

## Adding Icons

Before building for distribution, add application icons to the `assets/` directory:

- `icon.png` - Base icon (512x512 or larger)
- `icon.ico` - Windows icon
- `icon.icns` - MacOS icon

See `assets/README.md` for icon generation tools.

## Technology Stack

- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime
- **Vanilla JavaScript**: No framework dependencies
- **electron-builder**: Build and packaging

## Security

- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC via preload script
- Content Security Policy enforced
- HTML sanitization for user input

## Claude Code Agents

This project includes custom agents in `.claude/agents/`:

- **electron-builder**: Building and packaging expert
- **feature-developer**: Feature implementation specialist
- **debugger**: Debugging and troubleshooting expert
- **windows-integration**: Windows-specific development specialist (hotkeys, system tray, window management, file system operations)

Use these agents with Claude Code for development assistance.

## Troubleshooting

### App won't start
- Check console for error messages
- Verify `npm install` completed successfully
- Delete `node_modules` and reinstall

### Build fails
- Ensure icon files exist in `assets/`
- Clear build cache: delete `dist/` folder
- Check `package.json` configuration
- Verify electron-builder is installed

### Tasks not saving
- Check browser console for errors
- Clear localStorage and try again
- Verify localStorage is enabled in your browser

## Future Enhancements

Potential features to add:
- Task categories and tags
- Due dates and reminders
- Priority levels
- Search and filtering
- Dark mode
- Import/export functionality
- Cloud sync
- Keyboard shortcuts

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
