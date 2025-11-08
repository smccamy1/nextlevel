# NextLevel Visual Flow Editor

A Node-RED inspired visual flow editor built with HTML5, CSS3, and vanilla JavaScript. This project provides a drag-and-drop interface for creating visual workflows with connected nodes.

## Features

- **Drag & Drop Interface**: Intuitive node placement from palette to canvas
- **Visual Node Connections**: SVG-based wiring system with Bézier curves
- **Node Configuration**: Modal dialogs for configuring node properties
- **Real-time Property Editing**: Side panel for live property updates
- **Multiple Node Types**: Input, Function, Transform, Filter, Output, and Debug nodes
- **Zoom & Pan**: Canvas navigation with zoom controls
- **Export/Import**: Save and load flows as JSON
- **Keyboard Shortcuts**: Quick actions with keyboard commands
- **Responsive Design**: Works on desktop and tablet devices

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for development server) or any static file server

### Running the Project

1. **Clone or download** this project to your local machine
2. **Open terminal** in the project directory
3. **Start development server**:
   ```bash
   python3 -m http.server 8080
   ```
   Or use VS Code's task: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start Development Server"

4. **Open browser** and navigate to `http://localhost:8080`

### Alternative Server Options

- **Node.js**: `npx serve .`
- **PHP**: `php -S localhost:8080`
- **VS Code Live Server**: Install Live Server extension and right-click `index.html`

## How to Use

### Creating Nodes

1. **Drag nodes** from the left palette onto the canvas
2. **Double-click nodes** to configure their properties
3. **Click nodes** to select and view properties in the right panel

### Connecting Nodes

1. **Click and drag** from an output port (right side of node)
2. **Drop onto** an input port (left side of another node)
3. **Click connections** to select them
4. **Press Delete** to remove selected connections

### Canvas Controls

- **Mouse wheel**: Zoom in/out
- **Click + drag background**: Pan the canvas
- **Zoom buttons**: Use toolbar controls (+, -, fit)
- **Delete key**: Remove selected nodes or connections
- **Escape**: Clear selection

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save flow to local storage
- `Ctrl/Cmd + D`: Deploy flow
- `Ctrl/Cmd + A`: Select all nodes
- `Ctrl/Cmd + =`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Zoom to fit
- `Delete/Backspace`: Delete selection
- `Escape`: Clear selection

## Project Structure

```
newui/
├── index.html          # Main application interface
├── css/
│   └── styles.css      # All styling and responsive design
├── js/
│   ├── app.js          # Application initialization and UI handlers
│   ├── flowEditor.js   # Core editor functionality and node management
│   └── nodeTypes.js    # Node type definitions and configurations
├── .vscode/
│   └── tasks.json      # VS Code development tasks
└── .github/
    └── copilot-instructions.md  # Development guidelines
```

## Architecture

### Core Components

1. **FlowEditor Class** (`flowEditor.js`)
   - Canvas management and SVG rendering
   - Node creation, selection, and movement
   - Connection system with visual feedback
   - Export/import functionality

2. **Node Types** (`nodeTypes.js`)
   - Predefined node categories and configurations
   - Input/output port definitions
   - Default properties and validation

3. **UI Application** (`app.js`)
   - Event handlers and user interactions
   - Keyboard shortcuts and notifications
   - Modal dialogs and property panels

### Data Structure

**Nodes** contain:
- Unique ID and type
- Position (x, y coordinates)
- Configuration properties
- Input/output port counts
- SVG element reference

**Links** contain:
- Source and target node IDs
- Port indices for connections
- SVG path element reference

## Node Types

### Input Nodes
- **Input**: Manual data entry point
- **Trigger**: Timer-based event generation

### Function Nodes  
- **Function**: Custom JavaScript processing
- **Filter**: Conditional message filtering
- **Transform**: Data transformation rules

### Output Nodes
- **Output**: Data output destination
- **Debug**: Development debugging output

## Customization

### Adding New Node Types

1. **Define node type** in `nodeTypes.js`:
   ```javascript
   newNodeType: {
       name: 'New Node',
       icon: '🔧',
       color: '#ff6b6b',
       category: 'function',
       inputs: 1,
       outputs: 1,
       defaults: { name: '', value: '' },
       configFields: [
           { name: 'name', label: 'Name', type: 'text' }
       ]
   }
   ```

2. **Add palette entry** in `index.html`:
   ```html
   <div class="palette-node" data-node-type="newNodeType">
       <i class="node-icon">🔧</i>
       <span>New Node</span>
   </div>
   ```

3. **Style the node** in `styles.css`:
   ```css
   .node-newNodeType {
       fill: #ff6b6b;
   }
   ```

### Styling Customization

- **Colors**: Modify CSS custom properties for consistent theming
- **Layout**: Adjust `.editor-container` flexbox properties
- **Animations**: Extend CSS animations for enhanced user feedback
- **Icons**: Replace Unicode emojis with custom SVG icons

## Development

### Code Organization

- **Modular Design**: Separate concerns between UI, editor logic, and data
- **Event-Driven**: Loosely coupled components via event listeners  
- **SVG-Based**: Scalable graphics for crisp rendering at any zoom
- **Vanilla JS**: No framework dependencies for lightweight deployment

### Performance Considerations

- **Efficient Rendering**: Minimal DOM manipulation during interactions
- **Event Delegation**: Optimized event handling for dynamic content
- **Memory Management**: Proper cleanup of event listeners and references

## Browser Compatibility

- **Chrome/Chromium**: Full support
- **Firefox**: Full support  
- **Safari**: Full support
- **Edge**: Full support
- **Mobile**: Basic functionality on touch devices

## Future Enhancements

- [ ] Multi-selection with Ctrl+click
- [ ] Group nodes functionality  
- [ ] Undo/redo system
- [ ] Copy/paste operations
- [ ] Custom node libraries
- [ ] Real-time collaboration
- [ ] Flow execution engine
- [ ] WebSocket integration
- [ ] Plugin architecture

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Test thoroughly across browsers
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by [Node-RED](https://nodered.org/) visual programming tool
- Built with modern web standards and best practices
- Designed for educational and prototyping purposes