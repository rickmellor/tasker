# Tasker - Project Memory

## Project Overview

Tasker is a cross-platform Electron-based task management application designed to run primarily on Windows, with MacOS support.

## Architecture

### Technology Stack
- **Electron**: Main framework for cross-platform desktop app
- **Node.js**: Backend runtime
- **HTML/CSS/JavaScript**: Frontend (vanilla JS, no framework dependencies)
- **electron-builder**: Build and packaging tool

### Project Structure
```
tasker/
├── .claude/               # Claude Code configuration
│   ├── claude.md          # This file - project memory
│   └── agents/            # Custom agents for development tasks
├── assets/                # Application icons and images
├── src/                   # Source code
│   ├── main.js           # Electron main process
│   ├── preload.js        # Preload script for IPC security
│   ├── index.html        # Main UI
│   ├── styles.css        # Application styling
│   └── renderer.js       # Frontend logic
├── dist/                  # Build output (gitignored)
└── package.json          # Project configuration

```

### Security Model
- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **Preload Script**: Used for secure IPC communication
- **CSP**: Content Security Policy implemented in HTML

## Key Features

1. **Authentication System**
   - Login page on app startup
   - Stubbed authentication (accepts any credentials for development)
   - Persistent login state using localStorage
   - User profile management

2. **File-Based Task Storage**
   - Markdown files for each task
   - Hierarchical folder structure for parent/child relationships
   - Configurable storage location (default: ~/tasks)
   - `.tasks` metadata files for ordering within each folder
   - Automatic folder creation and management
   - Task trees can be moved/reorganized on disk

3. **Task Management**
   - Create, delete, and toggle tasks
   - Hierarchical task organization (parent/child relationships)
   - Expand/collapse task hierarchies
   - Drag-and-drop to reorder tasks
   - Drag onto tasks to make them children
   - Task statistics (total, completed, pending)
   - Task edit modal with fields:
     - Title (editable)
     - Details/body (editable textarea)
     - Priority (normal/high)
     - Due date (optional date picker)
     - Created date (read-only)
   - Multi-select filter system:
     - All (default, mutually exclusive)
     - High Priority
     - Complete
     - Not Complete
     - Past Due
     - Due Soon (next 3 days)
   - Hierarchical filtering (shows parents if children match)
   - Clean, monospace-font technical UI
   - Everything is a task (no separate container concept)
   - **Smart Task Organization:**
     - New tasks automatically positioned at bottom of incomplete tasks, above completed tasks
     - New tasks created at same nesting level as selected task
     - Completing a task automatically moves it to bottom (above other completed tasks)
     - Selection automatically moves to nearest incomplete task after completion
     - Maintains organization: incomplete tasks at top, completed at bottom

4. **Navigation & Views**
   - Vertical sidebar navigation
   - Three main views:
     - **Tasks**: Main task management interface
     - **Profile**: User profile with task statistics
     - **Settings**: Application configuration (theme, storage path)
   - Smooth view transitions

5. **Theme System**
   - Light and dark themes
   - Automatic OS theme detection (default)
   - Manual theme override in settings
   - Real-time theme switching
   - Persistent theme preferences
   - Responds to system theme changes

6. **Cross-Platform Support**
   - Windows: NSIS installer and portable executable
   - MacOS: DMG and ZIP packages

7. **Development Mode**
   - DevTools accessible with `--dev` flag
   - `npm run dev` for development

## Build Targets

### Windows
- NSIS installer (both x64 and ia32)
- Portable executable (x64 only)

### MacOS
- DMG image
- ZIP archive

## Development Workflow

### Setup
```bash
npm install
```

### Run Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build:win    # Windows only
npm run build:mac    # MacOS only
npm run build:all    # Both platforms
```

## UI/UX Design

The application follows a lightweight, technical-focused design philosophy:

### Design Principles
- **Minimalist**: Clean interfaces with no unnecessary elements
- **Technical**: Monospace fonts for data and technical information
- **Flat**: No heavy shadows or gradients (except subtle borders)
- **Responsive**: Smooth transitions and hover states
- **Accessible**: Clear labels, good contrast, uppercase section headers

### Color Scheme
- **Light Theme**: White backgrounds, gray accents, blue primary color
- **Dark Theme**: Dark gray backgrounds, lighter text, brighter blue accents
- Theme uses CSS custom properties for easy customization

### Typography
- System fonts for UI elements
- Monospace fonts (Consolas, Monaco, Courier New) for:
  - Task text
  - Input fields
  - Profile information
  - Settings values
  - Platform/version info

### Layout
- 200px vertical sidebar for navigation
- Full-height content area with scrolling
- Consistent padding and spacing
- Bordered sections for organization

## Future Enhancements

Consider adding:
- Task categories/tags
- Reminders and notifications
- Search functionality (text-based search)
- Export/import tasks
- Sync across devices
- Keyboard shortcuts
- Global hotkey support
- System tray integration
- Real authentication backend
- Task attachments/files
- Task comments/history

## Task File Structure

Tasks are stored as markdown files in a hierarchical folder structure:

```
~/tasks/                          # Default tasks folder
├── .tasks                        # Metadata: task order
├── 1234567890-project-alpha.md  # Task file
├── 1234567891-setup-backend.md
└── 1234567891-setup-backend/    # Folder for child tasks
    ├── .tasks                    # Child task ordering
    ├── 1234567892-install-node.md
    └── 1234567893-setup-db.md
```

### Task File Format (Markdown with Frontmatter)

```markdown
---
completed: false
title: Project Alpha
priority: normal
dueDate: 2025-01-25
created: 2025-01-19T12:00:00.000Z
---

# Project Alpha

Task description and notes go here.
```

### Metadata File (.tasks)

```json
{
  "order": [
    "1234567890-project-alpha.md",
    "1234567891-setup-backend.md"
  ],
  "created": "2025-01-19T12:00:00.000Z",
  "modified": "2025-01-19T12:00:00.000Z"
}
```

## Notes

- Tasks stored as markdown files on disk (configurable location)
- User preferences stored in localStorage
- Login is currently stubbed (accepts any credentials)
- Icon files need to be added to the `assets/` directory before building
- Theme automatically detects and follows OS preference by default
- Tasks can be edited directly in any markdown editor
- Drag-and-drop creates folders and moves files automatically

## Agent Usage

Custom agents are available in `.claude/agents/` to help with:

### electron-builder-agent
Expert in building and packaging Electron applications for Windows and MacOS. Use for:
- Running builds for specific platforms
- Troubleshooting build errors
- Configuring electron-builder settings
- Managing build artifacts

### feature-developer-agent
Specialist in implementing new features for the Tasker application. Use for:
- Adding new functionality
- Implementing IPC communication
- UI/UX development
- Data structure design
- Maintaining code quality

### debugger-agent
Expert in debugging and troubleshooting Electron applications. Use for:
- Diagnosing runtime errors
- Main and renderer process debugging
- IPC communication issues
- Performance optimization
- Build failure resolution

### windows-integration-agent
**Windows specialist** for platform-specific integrations. Use for:
- Global keyboard shortcuts (hotkeys)
- Window management (modality, z-ordering, always-on-top)
- System tray integration
- File system operations (dialogs, watchers, paths)
- Windows notifications
- Protocol handlers (custom URL schemes)
- Start with Windows (auto-launch)
- Jump lists and recent files
- Registry access
- Multi-monitor support
