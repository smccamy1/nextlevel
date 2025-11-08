// Flow Editor Core Class
class FlowEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.svg = this.canvas;
        this.nodesLayer = document.getElementById('nodes-layer');
        this.linksLayer = document.getElementById('links-layer');
        this.tempLayer = document.getElementById('temp-layer');
        
        // State
        this.nodes = new Map();
        this.links = new Map();
        this.selectedNode = null;
        this.selectedLink = null;
        this.isDragging = false;
        this.isConnecting = false;
        this.nodeCounter = 0;
        this.linkCounter = 0;
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        
        // Mouse interaction state
        this.dragState = null;
        
        // Connection state
        this.connectionStart = null;
        this.tempLine = null;
        
        this.initializeEventListeners();
        this.setupPalette();
    }

    initializeEventListeners() {
        // Canvas events
        this.svg.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.onCanvasMouseUp.bind(this));
        this.svg.addEventListener('click', this.onCanvasClick.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Prevent context menu
        this.svg.addEventListener('contextmenu', e => e.preventDefault());
    }

    setupPalette() {
        const paletteNodes = document.querySelectorAll('.palette-node');
        paletteNodes.forEach(node => {
            node.addEventListener('dragstart', this.onPaletteDragStart.bind(this));
            node.addEventListener('click', this.onPaletteClick.bind(this));
            node.draggable = true;
        });

        // Canvas drop zone
        this.svg.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        this.svg.addEventListener('drop', this.onCanvasDrop.bind(this));
    }

    onPaletteDragStart(e) {
        const nodeType = e.target.closest('.palette-node').dataset.nodeType;
        e.dataTransfer.setData('text/plain', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
    }

    onPaletteClick(e) {
        const nodeType = e.target.closest('.palette-node').dataset.nodeType;
        this.showNodeConfig(nodeType);
    }

    onCanvasDrop(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        if (nodeType && NODE_TYPES[nodeType]) {
            const rect = this.svg.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
            const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;
            this.createNode(nodeType, x, y);
        }
    }

    createNode(type, x, y, config = {}) {
        const nodeId = `node_${++this.nodeCounter}`;
        const nodeType = NODE_TYPES[type];
        if (!nodeType) return null;

        const nodeConfig = { ...nodeType.defaults, ...config };
        
        const node = {
            id: nodeId,
            type: type,
            x: x,
            y: y,
            width: 120,
            height: 40,
            config: nodeConfig,
            inputs: nodeType.inputs,
            outputs: nodeType.outputs,
            element: null
        };

        // Create SVG elements
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('class', 'flow-node node-added');
        nodeGroup.setAttribute('transform', `translate(${x}, ${y})`);
        nodeGroup.setAttribute('data-node-id', nodeId);

        // Node body
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', `node-body node-${type}`);
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('style', `fill: ${nodeType.color}`);

        // Node label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'node-text');
        text.setAttribute('x', node.width / 2);
        text.setAttribute('y', node.height / 2);
        text.textContent = nodeConfig.name || nodeType.name;

        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);

        // Add input ports
        for (let i = 0; i < node.inputs; i++) {
            const port = this.createPort('input', i, node);
            nodeGroup.appendChild(port);
        }

        // Add output ports
        for (let i = 0; i < node.outputs; i++) {
            const port = this.createPort('output', i, node);
            nodeGroup.appendChild(port);
        }

        // Event listeners
        nodeGroup.addEventListener('mousedown', this.onNodeMouseDown.bind(this));
        nodeGroup.addEventListener('dblclick', this.onNodeDoubleClick.bind(this));

        this.nodesLayer.appendChild(nodeGroup);
        node.element = nodeGroup;
        this.nodes.set(nodeId, node);

        return node;
    }

    createPort(type, index, node) {
        const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        port.setAttribute('class', `node-port port-${type}`);
        port.setAttribute('r', '6');
        
        if (type === 'input') {
            port.setAttribute('cx', '-6');
            port.setAttribute('cy', node.height / 2 + (index - (node.inputs - 1) / 2) * 15);
        } else {
            port.setAttribute('cx', node.width + 6);
            port.setAttribute('cy', node.height / 2 + (index - (node.outputs - 1) / 2) * 15);
        }

        port.setAttribute('data-port-type', type);
        port.setAttribute('data-port-index', index);
        port.addEventListener('mousedown', this.onPortMouseDown.bind(this));

        return port;
    }

    onNodeMouseDown(e) {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        
        const nodeElement = e.currentTarget;
        const nodeId = nodeElement.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        
        if (!node) return;

        this.selectNode(node);
        
        // Store the current node position and mouse position
        this.dragState = {
            node: node,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startNodeX: node.x,
            startNodeY: node.y,
            hasMoved: false
        };
    }

    onNodeDoubleClick(e) {
        e.stopPropagation();
        const nodeElement = e.currentTarget;
        const nodeId = nodeElement.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        
        if (node) {
            this.showNodeConfig(node.type, node);
        }
    }

    onPortMouseDown(e) {
        e.stopPropagation();
        const port = e.target;
        const nodeElement = port.closest('.flow-node');
        const nodeId = nodeElement.dataset.nodeId;
        const node = this.nodes.get(nodeId);
        const portType = port.dataset.portType;
        const portIndex = parseInt(port.dataset.portIndex);

        if (portType === 'output') {
            this.startConnection(node, portIndex, e);
        }
    }

    startConnection(sourceNode, outputIndex, e) {
        this.isConnecting = true;
        this.connectionStart = { node: sourceNode, port: outputIndex };
        
        const portElement = e.target;
        const portRect = portElement.getBoundingClientRect();
        const canvasRect = this.svg.getBoundingClientRect();
        
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempLine.setAttribute('class', 'temp-line');
        this.tempLayer.appendChild(this.tempLine);

        document.addEventListener('mousemove', this.onConnectionMouseMove.bind(this));
        document.addEventListener('mouseup', this.onConnectionMouseUp.bind(this));
    }

    onConnectionMouseMove(e) {
        if (this.isConnecting && this.tempLine) {
            const rect = this.svg.getBoundingClientRect();
            const sourceNode = this.connectionStart.node;
            const startX = sourceNode.x + sourceNode.width + 6;
            const startY = sourceNode.y + sourceNode.height / 2;
            const endX = (e.clientX - rect.left) / this.scale - this.panOffset.x;
            const endY = (e.clientY - rect.top) / this.scale - this.panOffset.y;

            const path = this.createConnectionPath(startX, startY, endX, endY);
            this.tempLine.setAttribute('d', path);
        }
    }

    onConnectionMouseUp(e) {
        if (this.isConnecting) {
            const target = e.target;
            if (target.classList.contains('node-port') && target.dataset.portType === 'input') {
                const targetNodeElement = target.closest('.flow-node');
                const targetNodeId = targetNodeElement.dataset.nodeId;
                const targetNode = this.nodes.get(targetNodeId);
                const targetPortIndex = parseInt(target.dataset.portIndex);

                if (targetNode && targetNode !== this.connectionStart.node) {
                    this.createConnection(
                        this.connectionStart.node,
                        this.connectionStart.port,
                        targetNode,
                        targetPortIndex
                    );
                }
            }

            this.endConnection();
        }

        document.removeEventListener('mousemove', this.onConnectionMouseMove.bind(this));
        document.removeEventListener('mouseup', this.onConnectionMouseUp.bind(this));
    }

    createConnection(sourceNode, sourcePort, targetNode, targetPort) {
        const linkId = `link_${++this.linkCounter}`;
        
        const link = {
            id: linkId,
            source: sourceNode.id,
            sourcePort: sourcePort,
            target: targetNode.id,
            targetPort: targetPort,
            element: null
        };

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection-line');
        path.setAttribute('data-link-id', linkId);
        
        this.updateConnectionPath(link, path);
        
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectLink(link);
        });

        this.linksLayer.appendChild(path);
        link.element = path;
        this.links.set(linkId, link);

        return link;
    }

    updateConnectionPath(link, pathElement) {
        const sourceNode = this.nodes.get(link.source);
        const targetNode = this.nodes.get(link.target);
        
        if (!sourceNode || !targetNode) return;

        const startX = sourceNode.x + sourceNode.width + 6;
        const startY = sourceNode.y + sourceNode.height / 2 + (link.sourcePort - (sourceNode.outputs - 1) / 2) * 15;
        const endX = targetNode.x - 6;
        const endY = targetNode.y + targetNode.height / 2 + (link.targetPort - (targetNode.inputs - 1) / 2) * 15;

        const path = this.createConnectionPath(startX, startY, endX, endY);
        pathElement.setAttribute('d', path);
    }

    createConnectionPath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const controlOffset = Math.max(30, Math.abs(dx) * 0.5);
        const cx1 = x1 + controlOffset;
        const cx2 = x2 - controlOffset;
        
        return `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
    }

    endConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        if (this.tempLine) {
            this.tempLayer.removeChild(this.tempLine);
            this.tempLine = null;
        }
    }

    onCanvasMouseDown(e) {
        if (e.target === this.svg || e.target.id === 'background') {
            this.clearSelection();
        }
    }

    onCanvasMouseMove(e) {
        if (!this.dragState) return;
        
        const dx = e.clientX - this.dragState.startMouseX;
        const dy = e.clientY - this.dragState.startMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse moved more than 5 pixels, start dragging
        if (distance > 5 && !this.dragState.hasMoved) {
            this.dragState.hasMoved = true;
            this.isDragging = true;
            this.dragState.node.element.classList.add('dragging');
        }
        
        // If we're dragging, update node position
        if (this.dragState.hasMoved) {
            const newX = this.dragState.startNodeX + (dx / this.scale);
            const newY = this.dragState.startNodeY + (dy / this.scale);
            
            this.moveNode(this.dragState.node, newX, newY);
        }
    }

    onCanvasMouseUp(e) {
        if (!this.dragState) return;
        
        // If we didn't move, this was a click
        if (!this.dragState.hasMoved && (this.dragState.node.type === 'exampleData'  || this.dragState.node.type === 'networkDataSim')) {
            this.executeNode(this.dragState.node);
        }
        
        // Clean up dragging state
        if (this.dragState.hasMoved) {
            this.dragState.node.element.classList.remove('dragging');
        }
        
        // Reset all state
        this.isDragging = false;
        this.dragState = null;
    }

    onCanvasClick(e) {
        if (e.target === this.svg || e.target.id === 'background') {
            this.clearSelection();
        }
    }

    moveNode(node, x, y) {
        node.x = x;
        node.y = y;
        node.element.setAttribute('transform', `translate(${x}, ${y})`);
        
        // Update connected links
        this.links.forEach(link => {
            if (link.source === node.id || link.target === node.id) {
                this.updateConnectionPath(link, link.element);
            }
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    clearDebugOutput(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node && node.debugOutputs) {
            node.debugOutputs = [];
            if (this.selectedNode === node) {
                this.updatePropertiesPanel(node);
            }
        }
    }

    selectNode(node) {
        this.clearSelection();
        this.selectedNode = node;
        node.element.classList.add('selected');
        this.updatePropertiesPanel(node);
    }

    selectLink(link) {
        this.clearSelection();
        this.selectedLink = link;
        link.element.classList.add('selected');
    }

    clearSelection() {
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
            this.selectedNode = null;
        }
        if (this.selectedLink) {
            this.selectedLink.element.classList.remove('selected');
            this.selectedLink = null;
        }
        this.showNoSelection();
    }

    deleteSelected() {
        if (this.selectedNode) {
            this.deleteNode(this.selectedNode.id);
        } else if (this.selectedLink) {
            this.deleteLink(this.selectedLink.id);
        }
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Delete connected links
        const linksToDelete = [];
        this.links.forEach((link, linkId) => {
            if (link.source === nodeId || link.target === nodeId) {
                linksToDelete.push(linkId);
            }
        });
        
        linksToDelete.forEach(linkId => this.deleteLink(linkId));

        // Remove any data tables associated with this node
        this.removeDataTable(nodeId);
        
        // Remove any graphs associated with this node
        this.removeGraph(nodeId);
        
        // Remove any network graphs associated with this node
        this.removeNetworkGraph(nodeId);
        
        // Clear any accumulated data
        if (node.accumulatedData) {
            node.accumulatedData = [];
        }
        
        // Clear any graph data
        if (node.graphData) {
            node.graphData = [];
        }
        
        // Clear any network data
        if (node.networkData) {
            node.networkData = { nodes: [], edges: [] };
        }

        // Remove node
        this.nodesLayer.removeChild(node.element);
        this.nodes.delete(nodeId);
        
        if (this.selectedNode === node) {
            this.clearSelection();
        }
    }

    deleteLink(linkId) {
        const link = this.links.get(linkId);
        if (!link) return;

        this.linksLayer.removeChild(link.element);
        this.links.delete(linkId);
        
        if (this.selectedLink === link) {
            this.clearSelection();
        }
    }

    onKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
        } else if (e.key === 'Escape') {
            this.clearSelection();
            if (this.isConnecting) {
                this.endConnection();
            }
        }
    }

    updatePropertiesPanel(node) {
        const propertiesContent = document.getElementById('properties-content');
        const nodeType = NODE_TYPES[node.type];
        
        let html = `
            <div class="property-group">
                <label class="property-label">Node Type</label>
                <input type="text" class="property-input" value="${nodeType.name}" readonly>
            </div>
            <div class="property-group">
                <label class="property-label">Node ID</label>
                <input type="text" class="property-input" value="${node.id}" readonly>
            </div>
        `;

        if (nodeType.configFields) {
            nodeType.configFields.forEach(field => {
                const value = node.config[field.name] || '';
                html += `
                    <div class="property-group">
                        <label class="property-label">${field.label}</label>
                `;
                
                if (field.type === 'textarea') {
                    html += `<textarea class="property-textarea" data-field="${field.name}">${value}</textarea>`;
                } else if (field.type === 'checkbox') {
                    html += `<input type="checkbox" data-field="${field.name}" ${value ? 'checked' : ''}>`;
                } else if (field.type === 'select') {
                    html += `<select class="property-input" data-field="${field.name}">`;
                    field.options.forEach(option => {
                        html += `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`;
                    });
                    html += `</select>`;
                } else {
                    html += `<input type="${field.type || 'text'}" class="property-input" data-field="${field.name}" value="${value}">`;
                }
                
                html += '</div>';
            });
        }

        // Add debug output panel for debug nodes
        if (node.type === 'debug' && node.debugOutputs && node.debugOutputs.length > 0) {
            html += `
                <div class="property-group">
                    <label class="property-label">Debug Output</label>
                    <div class="debug-output-panel">
                        <div class="debug-output-header">
                            <span>Recent Messages (${node.debugOutputs.length})</span>
                            <button class="clear-debug-btn" data-node-id="${node.id}">Clear</button>
                        </div>
                        <div class="debug-output-list">
            `;
            
            node.debugOutputs.forEach((entry, index) => {
                const dataStr = typeof entry.data === 'object' ? JSON.stringify(entry.data, null, 2) : String(entry.data);
                html += `
                    <div class="debug-entry ${index === 0 ? 'debug-entry-latest' : ''}">
                        <div class="debug-timestamp">${entry.timestamp}</div>
                        <div class="debug-data">
                            <pre><code>${this.escapeHtml(dataStr)}</code></pre>
                        </div>
                        <div class="debug-expand-btn" onclick="this.parentElement.classList.toggle('debug-entry-expanded')">
                            📋 ${typeof entry.data === 'object' ? 'JSON' : 'Data'}
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        } else if (node.type === 'debug') {
            html += `
                <div class="property-group">
                    <label class="property-label">Debug Output</label>
                    <div class="debug-output-panel">
                        <div class="debug-no-data">No messages received yet</div>
                    </div>
                </div>
            `;
        }

        propertiesContent.innerHTML = html;

        // Add event listeners to update node config
        const fields = propertiesContent.querySelectorAll('[data-field]');
        fields.forEach(field => {
            field.addEventListener('input', (e) => {
                const fieldName = e.target.dataset.field;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                node.config[fieldName] = value;
                
                // Update node label if name changed
                if (fieldName === 'name') {
                    const textElement = node.element.querySelector('.node-text');
                    textElement.textContent = value || nodeType.name;
                }
            });
        });

        // Add event listener for clear debug button
        const clearDebugBtn = propertiesContent.querySelector('.clear-debug-btn');
        if (clearDebugBtn) {
            clearDebugBtn.addEventListener('click', (e) => {
                const nodeId = e.target.dataset.nodeId;
                this.clearDebugOutput(nodeId);
            });
        }
    }

    showNoSelection() {
        const propertiesContent = document.getElementById('properties-content');
        propertiesContent.innerHTML = `
            <div class="no-selection">
                <p>Select a node to view its properties</p>
            </div>
        `;
    }

    showNodeConfig(nodeType, existingNode = null) {
        const modal = document.getElementById('node-config-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        const type = NODE_TYPES[nodeType];
        if (!type) return;

        modalTitle.textContent = existingNode ? `Edit ${type.name}` : `Configure ${type.name}`;
        
        let html = '';
        if (type.configFields) {
            type.configFields.forEach(field => {
                const value = existingNode ? (existingNode.config[field.name] || '') : (type.defaults[field.name] || '');
                html += `
                    <div class="property-group">
                        <label class="property-label">${field.label}</label>
                `;
                
                if (field.type === 'textarea') {
                    html += `<textarea class="property-textarea" data-field="${field.name}">${value}</textarea>`;
                } else if (field.type === 'checkbox') {
                    html += `<input type="checkbox" data-field="${field.name}" ${value ? 'checked' : ''}>`;
                } else if (field.type === 'select') {
                    html += `<select class="property-input" data-field="${field.name}">`;
                    field.options.forEach(option => {
                        html += `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`;
                    });
                    html += `</select>`;
                } else {
                    html += `<input type="${field.type || 'text'}" class="property-input" data-field="${field.name}" value="${value}">`;
                }
                
                html += '</div>';
            });
        }

        modalBody.innerHTML = html;
        modal.style.display = 'block';

        // Store context for saving
        modal.dataset.nodeType = nodeType;
        if (existingNode) {
            modal.dataset.nodeId = existingNode.id;
        } else {
            delete modal.dataset.nodeId;
        }
    }

    saveNodeConfig() {
        const modal = document.getElementById('node-config-modal');
        const nodeType = modal.dataset.nodeType;
        const nodeId = modal.dataset.nodeId;
        const fields = modal.querySelectorAll('[data-field]');
        
        const config = {};
        fields.forEach(field => {
            const value = field.type === 'checkbox' ? field.checked : field.value;
            config[field.name] = value;
        });

        if (nodeId) {
            // Update existing node
            const node = this.nodes.get(nodeId);
            if (node) {
                Object.assign(node.config, config);
                const textElement = node.element.querySelector('.node-text');
                textElement.textContent = config.name || NODE_TYPES[node.type].name;
                if (this.selectedNode === node) {
                    this.updatePropertiesPanel(node);
                }
            }
        } else {
            // Create new node at center of canvas
            const rect = this.svg.getBoundingClientRect();
            const x = (rect.width / 2) / this.scale - this.panOffset.x;
            const y = (rect.height / 2) / this.scale - this.panOffset.y;
            this.createNode(nodeType, x, y, config);
        }

        this.closeModal();
    }

    closeModal() {
        const modal = document.getElementById('node-config-modal');
        modal.style.display = 'none';
    }

    // Zoom and pan methods
    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3);
        this.updateTransform();
    }

    zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.1);
        this.updateTransform();
    }

    zoomFit() {
        // Implementation for zoom to fit all nodes
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        this.updateTransform();
    }

    updateTransform() {
        // Apply zoom and pan transformations
        const mainGroup = this.svg.querySelector('g');
        if (mainGroup) {
            mainGroup.setAttribute('transform', `translate(${this.panOffset.x}, ${this.panOffset.y}) scale(${this.scale})`);
        }
    }

    // Export/Import methods
    exportFlow() {
        const flow = {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                config: { ...node.config }
            })),
            links: Array.from(this.links.values()).map(link => ({
                source: link.source,
                sourcePort: link.sourcePort,
                target: link.target,
                targetPort: link.targetPort
            }))
        };
        return JSON.stringify(flow, null, 2);
    }

    importFlow(flowData) {
        try {
            const flow = JSON.parse(flowData);
            this.clearAll();
            
            // Create nodes first
            flow.nodes.forEach(nodeData => {
                this.createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.config);
            });
            
            // Then create links
            flow.links.forEach(linkData => {
                const sourceNode = Array.from(this.nodes.values()).find(n => n.id === linkData.source);
                const targetNode = Array.from(this.nodes.values()).find(n => n.id === linkData.target);
                if (sourceNode && targetNode) {
                    this.createConnection(sourceNode, linkData.sourcePort, targetNode, linkData.targetPort);
                }
            });
        } catch (error) {
            console.error('Failed to import flow:', error);
        }
    }

    clearAll() {
        this.nodes.clear();
        this.links.clear();
        this.nodesLayer.innerHTML = '';
        this.linksLayer.innerHTML = '';
        this.clearSelection();
    }

    // Node execution functionality
    executeNode(node) {
        console.log(`Executing node: ${node.id} (${node.type})`);
        
        if (node.type === 'exampleData') {
            this.executeExampleDataNode(node);
            this.executeNetworkDataSimNode(node);
        }
    }

    executeExampleDataNode(node) {
        try {
            let payload;
            const dataType = node.config.dataType || 'object';
            const rawPayload = node.config.payload || '';

            // Parse the payload based on data type
            switch (dataType) {
                case 'string':
                    payload = rawPayload;
                    break;
                case 'number':
                    payload = parseFloat(rawPayload) || 0;
                    break;
                case 'boolean':
                    payload = rawPayload.toLowerCase() === 'true';
                    break;
                case 'object':
                case 'array':
                    payload = JSON.parse(rawPayload);
                    break;
                default:
                    payload = rawPayload;
            }

            const message = {
                payload: payload,
                topic: node.config.name || 'exampleData',
                timestamp: new Date().toISOString(),
                source: node.id
            };

            // Visual feedback - flash the node
            this.flashNode(node);

            // Send message to connected nodes
            this.sendMessage(node, message);

            // Only log that execution started, not the data itself
            console.log(`Example Data node "${node.config.name || node.id}" executed - sending data to connected nodes`);

        } catch (error) {
            console.error(`Error executing example data node ${node.id}:`, error);
            this.showExecutionError(node, error.message);
        }
    }



    executeNetworkDataSimNode(node) {
        try {
            const config = node.config || {};
            const networkType = config.networkType || 'social';
            const nodeCount = parseInt(config.nodeCount) || 8;
            const connectivity = parseFloat(config.connectivity) || 0.3;
            const includeAttributes = config.includeAttributes !== false;

            const networkData = this.generateNetworkData(networkType, nodeCount, connectivity, includeAttributes);
            
            // Create proper message format with payload
            const message = {
                payload: networkData,
                topic: 'network-simulation',
                timestamp: new Date().toISOString(),
                _msgid: this.generateMessageId()
            };

            // Send the network data to connected nodes
            this.sendMessage(node, message);

            // Visual feedback - flash the node
            this.flashNode(node);

            console.log(`🔗 Network Data Simulation node "${node.config?.name || node.id}" executed - sending ${networkData.nodes.length} nodes and ${networkData.edges.length} edges to connected nodes`);

        } catch (error) {
            console.error('Error in network data simulation:', error);
        }
    }

    generateNetworkData(networkType, nodeCount, connectivity, includeAttributes) {
        const nodes = [];
        const links = [];

        // Generate network nodes based on type
        if (networkType === 'social') {
            const socialRoles = ['Friend', 'Family', 'Colleague', 'Acquaintance', 'Neighbor'];
            const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
            
            for (let i = 0; i < nodeCount; i++) {
                const node = {
                    id: `person_${i}`,
                    label: names[i] || `Person ${i}`,
                    type: 'person'
                };
                
                if (includeAttributes) {
                    node.role = socialRoles[Math.floor(Math.random() * socialRoles.length)];
                    node.age = Math.floor(Math.random() * 60) + 18;
                    node.influence = Math.floor(Math.random() * 100);
                }
                
                nodes.push(node);
            }
        } else if (networkType === 'organizational') {
            const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
            const positions = ['Manager', 'Director', 'Analyst', 'Specialist', 'Coordinator'];
            
            for (let i = 0; i < nodeCount; i++) {
                const node = {
                    id: `emp_${i}`,
                    label: `Employee ${i + 1}`,
                    type: 'employee'
                };
                
                if (includeAttributes) {
                    node.department = departments[Math.floor(Math.random() * departments.length)];
                    node.position = positions[Math.floor(Math.random() * positions.length)];
                    node.experience = Math.floor(Math.random() * 20) + 1;
                    node.salary = Math.floor(Math.random() * 100000) + 40000;
                }
                
                nodes.push(node);
            }
        } else if (networkType === 'technical') {
            const techTypes = ['Server', 'Database', 'API', 'Frontend', 'Gateway', 'Cache', 'Queue', 'Service'];
            
            for (let i = 0; i < nodeCount; i++) {
                const node = {
                    id: `tech_${i}`,
                    label: `${techTypes[i % techTypes.length]}-${Math.floor(i / techTypes.length) + 1}`,
                    type: 'component'
                };
                
                if (includeAttributes) {
                    node.status = Math.random() > 0.8 ? 'down' : 'up';
                    node.load = Math.floor(Math.random() * 100);
                    node.memory = Math.floor(Math.random() * 16) + 1; // GB
                    node.cpu = Math.floor(Math.random() * 100);
                }
                
                nodes.push(node);
            }
        } else { // random
            for (let i = 0; i < nodeCount; i++) {
                const node = {
                    id: `node_${i}`,
                    label: `Node ${i + 1}`,
                    type: 'generic'
                };
                
                if (includeAttributes) {
                    node.value = Math.floor(Math.random() * 1000);
                    node.category = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
                    node.weight = parseFloat((Math.random() * 10).toFixed(2));
                }
                
                nodes.push(node);
            }
        }

        // Generate links based on connectivity
        const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
        const targetLinkCount = Math.floor(maxPossibleLinks * connectivity);

        const usedPairs = new Set();
        
        for (let i = 0; i < targetLinkCount; i++) {
            let source, target, pairKey;
            let attempts = 0;
            
            do {
                source = Math.floor(Math.random() * nodeCount);
                target = Math.floor(Math.random() * nodeCount);
                pairKey = `${Math.min(source, target)}-${Math.max(source, target)}`;
                attempts++;
                
                if (attempts > targetLinkCount * 2) break; // Prevent infinite loop
            } while (source === target || usedPairs.has(pairKey));
            
            if (source !== target && !usedPairs.has(pairKey)) {
                usedPairs.add(pairKey);
                
                const link = {
                    source: nodes[source].id,
                    target: nodes[target].id
                };
                
                if (includeAttributes) {
                    link.weight = parseFloat((Math.random() * 10 + 1).toFixed(2));
                    if (networkType === 'social') {
                        link.relationship = ['friend', 'family', 'colleague'][Math.floor(Math.random() * 3)];
                    } else if (networkType === 'organizational') {
                        link.reportingLine = Math.random() > 0.7;
                    } else if (networkType === 'technical') {
                        link.protocol = ['HTTP', 'TCP', 'UDP', 'WebSocket'][Math.floor(Math.random() * 4)];
                        link.latency = Math.floor(Math.random() * 100) + 1; // ms
                    }
                }
                
                links.push(link);
            }
        }

        return {
            nodes,
            edges: links,  // Changed from 'links' to 'edges' to match Graph Viz expectation
            metadata: {
                networkType,
                nodeCount,
                linkCount: links.length,
                connectivity,
                generated: new Date().toISOString()
            }
        };
    }

    generateMessageId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    sendMessage(sourceNode, message) {
        // Find all outgoing connections from this node
        const outgoingLinks = Array.from(this.links.values()).filter(link => 
            link.source === sourceNode.id
        );

        outgoingLinks.forEach(link => {
            const targetNode = this.nodes.get(link.target);
            if (targetNode) {
                // Add a small delay to show the flow visually
                setTimeout(() => {
                    this.receiveMessage(targetNode, message, link);
                }, 100);
            }
        });

        // Log the message flow
        if (outgoingLinks.length > 0) {
            console.log(`💫 Data flowing from "${sourceNode.config.name || sourceNode.id}" to ${outgoingLinks.length} connected node(s)`);
        } else {
            console.log(`⚠️ No connections from "${sourceNode.config.name || sourceNode.id}" - data not forwarded`);
        }
    }

    receiveMessage(node, message, link) {
        // Flash the receiving node to show data flow
        this.flashNode(node);

        // Handle different node types - let them process the message
        switch (node.type) {
            case 'debug':
                this.executeDebugNode(node, message);
                break;
            case 'output':
                this.executeOutputNode(node, message);
                break;
            case 'function':
                this.executeFunctionNode(node, message);
                break;
            case 'dataTable':
                this.executeDataTableNode(node, message);
                break;
            case 'chartNode':
                this.executeChartNode(node, message);
                break;
            case 'graphViz':
                this.executeGraphVizNode(node, message);
                break;
            default:
                console.log(`Node ${node.id} (${node.type}) received message but no handler defined`);
        }
    }

    executeDebugNode(node, message) {
        const output = node.config.complete === 'payload' ? message.payload : message;
        console.log(`[DEBUG ${node.config.name || node.id}]:`, output);
        
        // Store the debug output in the node for display
        if (!node.debugOutputs) {
            node.debugOutputs = [];
        }
        
        const debugEntry = {
            timestamp: new Date().toLocaleTimeString(),
            data: output,
            fullMessage: message
        };
        
        // Keep only last 10 entries
        node.debugOutputs.unshift(debugEntry);
        if (node.debugOutputs.length > 10) {
            node.debugOutputs = node.debugOutputs.slice(0, 10);
        }
        
        // Update properties panel if this node is selected
        if (this.selectedNode && this.selectedNode.id === node.id) {
            this.updatePropertiesPanel(node);
        }
    }

    executeOutputNode(node, message) {
        const nodeName = node.config.name || node.id;
        const target = node.config.target || 'console';
        
        console.log(`[OUTPUT ${nodeName}] Target: ${target}`);
        console.log(`[OUTPUT ${nodeName}] Data:`, message.payload);
        console.log(`[OUTPUT ${nodeName}] Full Message:`, message);
        
        // Handle different output targets
        switch (target) {
            case 'console':
                console.log(`📤 Console Output from ${nodeName}:`, message.payload);
                break;
            case 'file':
                console.log(`📁 File Output from ${nodeName}: (would save to file)`, message.payload);
                break;
            case 'database':
                console.log(`🗄️ Database Output from ${nodeName}: (would save to database)`, message.payload);
                break;
            default:
                console.log(`📤 Output from ${nodeName}:`, message.payload);
        }
    }

    executeFunctionNode(node, message) {
        try {
            const nodeName = node.config.name || node.id;
            console.log(`⚙️ Function node "${nodeName}" processing message...`);
            
            // For now, just pass the message through unchanged
            // In a real implementation, this would execute the custom function code
            const processedMessage = { ...message };
            
            console.log(`✅ Function node "${nodeName}" completed processing`);
            
            // Pass the message to connected nodes
            this.sendMessage(node, processedMessage);
        } catch (error) {
            console.error(`❌ Function node "${node.config.name || node.id}" error:`, error);
        }
    }



    createConnectionsBasedOnStrategy(nodes, edges, strategy) {
        const usedPairs = new Set();
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];
                const pairKey = `${nodeA.id}-${nodeB.id}`;
                
                if (usedPairs.has(pairKey)) continue;
                
                let shouldConnect = false;
                let connectionReason = '';
                let weight = 1;
                
                switch (strategy) {
                    case 'ip_similarity':
                        // Connect users who share IP addresses
                        const sharedIPs = nodeA.ipAddresses.filter(ip => nodeB.ipAddresses.includes(ip));
                        if (sharedIPs.length > 0) {
                            shouldConnect = true;
                            connectionReason = `Shared IP: ${sharedIPs[0]}`;
                            weight = sharedIPs.length;
                        }
                        break;
                        
                    case 'geo_location':
                        // Connect users from the same city/country
                        if (nodeA.city && nodeB.city && nodeA.city === nodeB.city) {
                            shouldConnect = true;
                            connectionReason = `Same city: ${nodeA.city}`;
                            weight = 2;
                        } else if (nodeA.country && nodeB.country && nodeA.country === nodeB.country) {
                            shouldConnect = true;
                            connectionReason = `Same country: ${nodeA.country}`;
                            weight = 1;
                        }
                        break;
                        
                    case 'time_proximity':
                        // Connect users with login times close together (within 1 hour)
                        const timeA = new Date(nodeA.lastSeen).getTime();
                        const timeB = new Date(nodeB.lastSeen).getTime();
                        const timeDiff = Math.abs(timeA - timeB);
                        const oneHour = 60 * 60 * 1000;
                        
                        if (timeDiff < oneHour) {
                            shouldConnect = true;
                            connectionReason = `Login time proximity: ${Math.round(timeDiff / (1000 * 60))} min apart`;
                            weight = Math.max(1, Math.round(10 - (timeDiff / (1000 * 60 * 6)))); // Higher weight for closer times
                        }
                        break;
                        
                    case 'user_agent':
                        // Connect users with similar user agents (same browser/OS)
                        const sharedAgents = nodeA.userAgents.filter(agent => nodeB.userAgents.includes(agent));
                        if (sharedAgents.length > 0) {
                            shouldConnect = true;
                            connectionReason = 'Similar user agent';
                            weight = sharedAgents.length;
                        }
                        break;
                }
                
                if (shouldConnect) {
                    edges.push({
                        source: nodeA.id,
                        target: nodeB.id,
                        weight: weight,
                        reason: connectionReason,
                        strategy: strategy
                    });
                    
                    usedPairs.add(pairKey);
                    usedPairs.add(`${nodeB.id}-${nodeA.id}`); // Prevent reverse duplicate
                }
            }
        }
    }




    createLoginEntry(login, index, config) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'login-entry';
        entryDiv.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 15px;
            margin-bottom: 15px;
            background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};
            border-radius: 8px;
            border: 1px solid #e9ecef;
        `;
        
        // Person section
        const personSection = document.createElement('div');
        personSection.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 120px;
        `;
        
        // Person icon
        const personIcon = document.createElement('div');
        personIcon.style.cssText = `
            font-size: 48px;
            margin-bottom: 8px;
        `;
        personIcon.textContent = '👤';
        personSection.appendChild(personIcon);
        
        // Person details
        const personDetails = document.createElement('div');
        personDetails.style.cssText = `
            text-align: center;
            font-size: 12px;
            color: #495057;
            line-height: 1.4;
        `;
        
        const userName = login.userName || login.userId || 'Unknown User';
        const userId = login.userId || 'N/A';
        const sessionId = login.sessionId ? login.sessionId.substring(0, 8) + '...' : 'N/A';
        
        personDetails.innerHTML = `
            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 4px;">${userName}</div>
            <div>ID: ${userId}</div>
            <div>Session: ${sessionId}</div>
            <div>IP: ${login.ipAddress || 'N/A'}</div>
        `;
        
        // Add geo location if enabled and available
        if (config.showGeoLocation !== false && login.geoLocation) {
            const geoDiv = document.createElement('div');
            geoDiv.style.cssText = 'margin-top: 4px; font-size: 11px; color: #6c757d;';
            geoDiv.innerHTML = `📍 ${login.geoLocation.city}, ${login.geoLocation.country}`;
            personDetails.appendChild(geoDiv);
        }
        
        personSection.appendChild(personDetails);
        entryDiv.appendChild(personSection);
        
        // Device section
        if (config.showDeviceDetails !== false) {
            const deviceSection = document.createElement('div');
            deviceSection.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 120px;
            `;
            
            // Device icon based on platform
            const deviceIcon = document.createElement('div');
            deviceIcon.style.cssText = `
                font-size: 48px;
                margin-bottom: 8px;
            `;
            
            const platform = login.deviceInfo?.platform || 'unknown';
            deviceIcon.textContent = platform === 'mobile' ? '📱' : '💻';
            deviceSection.appendChild(deviceIcon);
            
            // Device details
            const deviceDetails = document.createElement('div');
            deviceDetails.style.cssText = `
                text-align: center;
                font-size: 12px;
                color: #495057;
                line-height: 1.4;
            `;
            
            if (login.deviceInfo) {
                deviceDetails.innerHTML = `
                    <div style="font-weight: bold; color: #2c3e50; margin-bottom: 4px;">${login.deviceInfo.platform || 'Unknown'}</div>
                    <div>OS: ${login.deviceInfo.os || 'N/A'}</div>
                    <div>Browser: ${login.deviceInfo.browser || 'N/A'}</div>
                    <div>Screen: ${login.deviceInfo.screenResolution || 'N/A'}</div>
                `;
            } else {
                deviceDetails.innerHTML = `
                    <div style="font-weight: bold; color: #2c3e50; margin-bottom: 4px;">Unknown Device</div>
                    <div>No device info</div>
                `;
            }
            
            deviceSection.appendChild(deviceDetails);
            entryDiv.appendChild(deviceSection);
        }
        
        // Login result section
        const resultSection = document.createElement('div');
        resultSection.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 100px;
        `;
        
        // Result icon
        const resultIcon = document.createElement('div');
        resultIcon.style.cssText = `
            font-size: 48px;
            margin-bottom: 8px;
        `;
        
        const loginResult = login.loginResult || 'UNKNOWN';
        if (loginResult === 'SUCCESS') {
            resultIcon.textContent = '✅';
            resultIcon.style.color = '#28a745';
        } else {
            resultIcon.textContent = '❌';
            resultIcon.style.color = '#dc3545';
        }
        resultSection.appendChild(resultIcon);
        
        // Result details
        const resultDetails = document.createElement('div');
        resultDetails.style.cssText = `
            text-align: center;
            font-size: 12px;
            color: #495057;
            line-height: 1.4;
        `;
        
        const timestamp = login.timestamp ? new Date(login.timestamp).toLocaleString() : 'N/A';
        const duration = login.loginDuration ? `${login.loginDuration}ms` : 'N/A';
        
        resultDetails.innerHTML = `
            <div style="font-weight: bold; color: ${loginResult === 'SUCCESS' ? '#28a745' : '#dc3545'}; margin-bottom: 4px;">${loginResult}</div>
            <div>Time: ${timestamp}</div>
            <div>Duration: ${duration}</div>
        `;
        
        // Add risk score if available
        if (login.behaviorMetrics?.riskScore !== undefined) {
            const riskDiv = document.createElement('div');
            const riskScore = login.behaviorMetrics.riskScore;
            const riskColor = riskScore > 70 ? '#dc3545' : riskScore > 40 ? '#ffc107' : '#28a745';
            riskDiv.style.cssText = `margin-top: 4px; font-size: 11px; color: ${riskColor}; font-weight: bold;`;
            riskDiv.innerHTML = `⚠️ Risk: ${riskScore}%`;
            resultDetails.appendChild(riskDiv);
        }
        
        resultSection.appendChild(resultDetails);
        entryDiv.appendChild(resultSection);
        
        return entryDiv;
    }

    executeDataTableNode(node, message) {
        try {
            const nodeName = node.config.name || node.id;
            console.log(`📊 Data Table node "${nodeName}" rendering data...`);
            
            // Extract data from message
            let newData = message.payload;
            
            // If data is not an array, try to convert it or wrap it
            if (!Array.isArray(newData)) {
                if (typeof newData === 'object' && newData !== null) {
                    // Convert single object to array
                    newData = [newData];
                } else {
                    console.warn(`Data Table node "${nodeName}" received non-object data, creating simple table`);
                    newData = [{ value: newData }];
                }
            }
            
            // Handle append mode
            let displayData;
            if (node.config.appendData) {
                // Initialize accumulated data if it doesn't exist
                if (!node.accumulatedData) {
                    node.accumulatedData = [];
                }
                
                // Append new data to accumulated data
                node.accumulatedData = node.accumulatedData.concat(newData);
                
                // Limit to maxRows from the end (show most recent data)
                const maxRows = parseInt(node.config.maxRows) || 10;
                if (node.accumulatedData.length > maxRows) {
                    node.accumulatedData = node.accumulatedData.slice(-maxRows);
                }
                
                displayData = node.accumulatedData;
                console.log(`📊 Appended ${newData.length} rows, total: ${displayData.length}`);
            } else {
                // Replace mode - just use new data
                node.accumulatedData = newData; // Still store for potential mode change
                displayData = newData;
            }
            
            // Remove any existing table for this node
            this.removeDataTable(node.id);
            
            // Create and render the table
            this.renderDataTable(node, displayData);
            
            console.log(`✅ Data Table node "${nodeName}" rendered ${displayData.length} rows`);
            
        } catch (error) {
            console.error(`❌ Data Table node "${node.config.name || node.id}" error:`, error);
        }
    }

    renderDataTable(node, data) {
        if (!data || data.length === 0) {
            console.log('No data to render in table');
            return;
        }

        // Limit rows based on configuration
        const maxRows = parseInt(node.config.maxRows) || 10;
        const displayData = data.slice(0, maxRows);
        
        // Get all unique keys from the data for column headers
        const allKeys = new Set();
        displayData.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => allKeys.add(key));
            }
        });
        const columns = Array.from(allKeys);
        
        // Calculate table dimensions
        const cellWidth = node.config.autoWidth ? 120 : 100;
        const cellHeight = 20;
        const headerHeight = node.config.showHeaders ? cellHeight : 0;
        const tableWidth = columns.length * cellWidth;
        const tableHeight = headerHeight + (displayData.length * cellHeight);
        
        // Create table group
        const tableGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tableGroup.setAttribute('class', 'data-table');
        tableGroup.setAttribute('data-node-id', node.id);
        tableGroup.setAttribute('transform', `translate(${node.x + node.width + 20}, ${node.y})`);
        
        // Background rectangle
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', tableWidth);
        background.setAttribute('height', tableHeight);
        background.setAttribute('fill', 'white');
        background.setAttribute('stroke', '#ddd');
        background.setAttribute('stroke-width', '1');
        tableGroup.appendChild(background);
        
        let currentY = 0;
        
        // Render headers if enabled
        if (node.config.showHeaders) {
            columns.forEach((column, colIndex) => {
                const x = colIndex * cellWidth;
                
                // Header cell background
                const headerCell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                headerCell.setAttribute('x', x);
                headerCell.setAttribute('y', currentY);
                headerCell.setAttribute('width', cellWidth);
                headerCell.setAttribute('height', cellHeight);
                headerCell.setAttribute('fill', '#f8f9fa');
                headerCell.setAttribute('stroke', '#ddd');
                headerCell.setAttribute('stroke-width', '0.5');
                tableGroup.appendChild(headerCell);
                
                // Header text
                const headerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                headerText.setAttribute('x', x + 5);
                headerText.setAttribute('y', currentY + cellHeight / 2);
                headerText.setAttribute('dominant-baseline', 'central');
                headerText.setAttribute('font-family', 'Arial, sans-serif');
                headerText.setAttribute('font-size', '11px');
                headerText.setAttribute('font-weight', 'bold');
                headerText.setAttribute('fill', '#333');
                headerText.textContent = this.truncateText(column, cellWidth - 10);
                tableGroup.appendChild(headerText);
            });
            currentY += cellHeight;
        }
        
        // Render data rows
        displayData.forEach((item, rowIndex) => {
            columns.forEach((column, colIndex) => {
                const x = colIndex * cellWidth;
                const y = currentY + (rowIndex * cellHeight);
                
                // Data cell background
                const dataCell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                dataCell.setAttribute('x', x);
                dataCell.setAttribute('y', y);
                dataCell.setAttribute('width', cellWidth);
                dataCell.setAttribute('height', cellHeight);
                dataCell.setAttribute('fill', rowIndex % 2 === 0 ? 'white' : '#f9f9f9');
                dataCell.setAttribute('stroke', '#ddd');
                dataCell.setAttribute('stroke-width', '0.5');
                tableGroup.appendChild(dataCell);
                
                // Data text
                const value = item[column];
                const displayValue = value !== undefined && value !== null ? String(value) : '';
                
                const dataText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                dataText.setAttribute('x', x + 5);
                dataText.setAttribute('y', y + cellHeight / 2);
                dataText.setAttribute('dominant-baseline', 'central');
                dataText.setAttribute('font-family', 'Arial, sans-serif');
                dataText.setAttribute('font-size', '10px');
                dataText.setAttribute('fill', '#333');
                dataText.textContent = this.truncateText(displayValue, cellWidth - 10);
                tableGroup.appendChild(dataText);
            });
        });
        
        // Add close button
        const closeButton = this.createTableCloseButton(tableWidth - 15, -15, node.id);
        tableGroup.appendChild(closeButton);
        
        // Add clear data button if append mode is enabled
        if (node.config.appendData) {
            const clearButton = this.createTableClearButton(tableWidth - 35, -15, node.id);
            tableGroup.appendChild(clearButton);
        }
        
        // Add table to canvas
        this.nodesLayer.appendChild(tableGroup);
        
        // Store reference for cleanup
        if (!node.dataTables) {
            node.dataTables = [];
        }
        node.dataTables.push(tableGroup);
    }

    createTableCloseButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'table-close-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        // Button background
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ff4757');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        // X symbol
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '×';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        // Click handler
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeDataTable(nodeId);
        });
        
        return buttonGroup;
    }

    createTableClearButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'table-clear-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        // Button background
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ffa502');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        // Clear symbol (↻)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '↻';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        // Click handler
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearTableData(nodeId);
        });
        
        return buttonGroup;
    }

    clearTableData(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            // Clear accumulated data
            node.accumulatedData = [];
            
            // Remove existing table
            this.removeDataTable(nodeId);
            
            // Render empty table or hide table
            console.log(`🗑️ Cleared accumulated data for table node "${node.config.name || nodeId}"`);
        }
    }

    removeDataTable(nodeId) {
        const existingTables = document.querySelectorAll(`.data-table[data-node-id="${nodeId}"]`);
        existingTables.forEach(table => {
            if (table.parentNode) {
                table.parentNode.removeChild(table);
            }
        });
        
        // Clear reference from node
        const node = this.nodes.get(nodeId);
        if (node && node.dataTables) {
            node.dataTables = [];
        }
    }

    truncateText(text, maxWidth) {
        if (typeof text !== 'string') return '';
        
        // Rough calculation: 1 character ≈ 6 pixels in 10px font
        const maxChars = Math.floor(maxWidth / 6);
        
        if (text.length <= maxChars) {
            return text;
        }
        
        return text.substring(0, maxChars - 3) + '...';
    }

    executeChartNode(node, message) {
        try {
            const nodeName = node.config.name || node.id;
            console.log(`📈 Chart node "${nodeName}" processing data...`);
            
            // Extract data from message
            let newData = message.payload;
            
            // Convert single objects to array
            if (!Array.isArray(newData)) {
                if (typeof newData === 'object' && newData !== null) {
                    newData = [newData];
                } else {
                    console.warn(`Chart node "${nodeName}" received non-object data`);
                    return;
                }
            }
            
            // Initialize data points if they don't exist
            if (!node.graphData) {
                node.graphData = [];
            }
            
            // Process new data points
            newData.forEach(item => {
                const xField = node.config.xField || 'timestamp';
                const yField = node.config.yField || 'value';
                
                let xValue, yValue;
                
                // Extract X value
                if (xField === 'timestamp' && !item[xField]) {
                    xValue = new Date().toISOString();
                } else {
                    xValue = item[xField];
                }
                
                // Extract Y value
                yValue = item[yField];
                
                // Only add if both values exist
                if (xValue !== undefined && yValue !== undefined) {
                    node.graphData.push({
                        x: xValue,
                        y: parseFloat(yValue) || 0,
                        timestamp: new Date().getTime()
                    });
                }
            });
            
            // Limit data points
            const maxPoints = parseInt(node.config.maxPoints) || 50;
            if (node.graphData.length > maxPoints) {
                node.graphData = node.graphData.slice(-maxPoints);
            }
            
            // Remove existing graph
            this.removeGraph(node.id);
            
            // Render new graph
            this.renderGraph(node);
            
            console.log(`✅ Chart node "${nodeName}" updated with ${node.graphData.length} points`);
            
        } catch (error) {
            console.error(`❌ Chart node "${node.config.name || node.id}" error:`, error);
        }
    }

    renderGraph(node) {
        if (!node.graphData || node.graphData.length === 0) {
            console.log('No data points to render in graph');
            return;
        }

        const data = node.graphData;
        const chartType = node.config.chartType || 'line';
        
        // Graph dimensions
        const graphWidth = 300;
        const graphHeight = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const plotWidth = graphWidth - margin.left - margin.right;
        const plotHeight = graphHeight - margin.top - margin.bottom;
        
        // Calculate scales
        const yValues = data.map(d => d.y);
        const yMin = node.config.autoScale ? Math.min(...yValues) : 0;
        const yMax = node.config.autoScale ? Math.max(...yValues) : Math.max(...yValues);
        const yRange = yMax - yMin || 1;
        
        // Create graph container
        const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        graphGroup.setAttribute('class', 'chart-visualization');
        graphGroup.setAttribute('data-node-id', node.id);
        graphGroup.setAttribute('transform', `translate(${node.x + node.width + 20}, ${node.y})`);
        
        // Background
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', graphWidth);
        background.setAttribute('height', graphHeight);
        background.setAttribute('fill', 'white');
        background.setAttribute('stroke', '#ddd');
        background.setAttribute('stroke-width', '1');
        background.setAttribute('rx', '4');
        graphGroup.appendChild(background);
        
        // Create plot area
        const plotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        plotGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Grid
        if (node.config.showGrid) {
            this.addGridLines(plotGroup, plotWidth, plotHeight);
        }
        
        // Plot data based on chart type
        switch (chartType) {
            case 'line':
                this.renderLineChart(plotGroup, data, plotWidth, plotHeight, yMin, yRange);
                break;
            case 'bar':
                this.renderBarChart(plotGroup, data, plotWidth, plotHeight, yMin, yRange);
                break;
            case 'scatter':
                this.renderScatterPlot(plotGroup, data, plotWidth, plotHeight, yMin, yRange);
                break;
            case 'area':
                this.renderAreaChart(plotGroup, data, plotWidth, plotHeight, yMin, yRange);
                break;
        }
        
        // Add axes
        this.addAxes(plotGroup, plotWidth, plotHeight, data, yMin, yMax);
        
        graphGroup.appendChild(plotGroup);
        
        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', graphWidth / 2);
        title.setAttribute('y', 15);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-family', 'Arial, sans-serif');
        title.setAttribute('font-size', '12px');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', '#333');
        title.textContent = node.config.name || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`;
        graphGroup.appendChild(title);
        
        // Add close button
        const closeButton = this.createGraphCloseButton(graphWidth - 15, 5, node.id);
        graphGroup.appendChild(closeButton);
        
        // Add clear button
        const clearButton = this.createGraphClearButton(graphWidth - 35, 5, node.id);
        graphGroup.appendChild(clearButton);
        
        // Add to canvas
        this.nodesLayer.appendChild(graphGroup);
        
        // Store reference
        if (!node.graphs) {
            node.graphs = [];
        }
        node.graphs.push(graphGroup);
    }

    addGridLines(plotGroup, width, height) {
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('class', 'grid');
        
        // Vertical grid lines
        for (let i = 0; i <= 5; i++) {
            const x = (i * width) / 5;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', height);
            line.setAttribute('stroke', '#f0f0f0');
            line.setAttribute('stroke-width', '1');
            gridGroup.appendChild(line);
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (i * height) / 4;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#f0f0f0');
            line.setAttribute('stroke-width', '1');
            gridGroup.appendChild(line);
        }
        
        plotGroup.appendChild(gridGroup);
    }

    renderLineChart(plotGroup, data, width, height, yMin, yRange) {
        if (data.length < 2) return;
        
        const points = data.map((d, i) => {
            const x = (i * width) / (data.length - 1);
            const y = height - ((d.y - yMin) / yRange) * height;
            return `${x},${y}`;
        }).join(' ');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#2ecc71');
        polyline.setAttribute('stroke-width', '2');
        polyline.setAttribute('stroke-linejoin', 'round');
        plotGroup.appendChild(polyline);
        
        // Add data points
        data.forEach((d, i) => {
            const x = (i * width) / (data.length - 1);
            const y = height - ((d.y - yMin) / yRange) * height;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', '#27ae60');
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '1');
            plotGroup.appendChild(circle);
        });
    }

    renderBarChart(plotGroup, data, width, height, yMin, yRange) {
        const barWidth = width / data.length * 0.8;
        const barSpacing = width / data.length * 0.2;
        
        data.forEach((d, i) => {
            const x = i * (width / data.length) + barSpacing / 2;
            const barHeight = ((d.y - yMin) / yRange) * height;
            const y = height - barHeight;
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', '#3498db');
            rect.setAttribute('stroke', '#2980b9');
            rect.setAttribute('stroke-width', '1');
            plotGroup.appendChild(rect);
        });
    }

    renderScatterPlot(plotGroup, data, width, height, yMin, yRange) {
        data.forEach((d, i) => {
            const x = (i * width) / (data.length - 1);
            const y = height - ((d.y - yMin) / yRange) * height;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', '#e74c3c');
            circle.setAttribute('stroke', '#c0392b');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('opacity', '0.7');
            plotGroup.appendChild(circle);
        });
    }

    renderAreaChart(plotGroup, data, width, height, yMin, yRange) {
        if (data.length < 2) return;
        
        let path = `M 0,${height}`;
        
        data.forEach((d, i) => {
            const x = (i * width) / (data.length - 1);
            const y = height - ((d.y - yMin) / yRange) * height;
            if (i === 0) {
                path += ` L ${x},${y}`;
            } else {
                path += ` L ${x},${y}`;
            }
        });
        
        path += ` L ${width},${height} Z`;
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('fill', '#9b59b6');
        pathElement.setAttribute('fill-opacity', '0.3');
        pathElement.setAttribute('stroke', '#8e44ad');
        pathElement.setAttribute('stroke-width', '2');
        plotGroup.appendChild(pathElement);
    }

    addAxes(plotGroup, width, height, data, yMin, yMax) {
        // Y-axis
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', '0');
        yAxis.setAttribute('y1', '0');
        yAxis.setAttribute('x2', '0');
        yAxis.setAttribute('y2', height);
        yAxis.setAttribute('stroke', '#333');
        yAxis.setAttribute('stroke-width', '1');
        plotGroup.appendChild(yAxis);
        
        // X-axis
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', '0');
        xAxis.setAttribute('y1', height);
        xAxis.setAttribute('x2', width);
        xAxis.setAttribute('y2', height);
        xAxis.setAttribute('stroke', '#333');
        xAxis.setAttribute('stroke-width', '1');
        plotGroup.appendChild(xAxis);
        
        // Y-axis labels
        for (let i = 0; i <= 4; i++) {
            const value = yMin + (yMax - yMin) * (1 - i / 4);
            const y = (i * height) / 4;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', -5);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-size', '9px');
            text.setAttribute('fill', '#666');
            text.textContent = value.toFixed(1);
            plotGroup.appendChild(text);
        }
        
        // X-axis labels (show first, middle, last)
        const indices = [0, Math.floor(data.length / 2), data.length - 1];
        indices.forEach(i => {
            if (i < data.length) {
                const x = (i * width) / (data.length - 1);
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', height + 15);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-family', 'Arial, sans-serif');
                text.setAttribute('font-size', '9px');
                text.setAttribute('fill', '#666');
                
                // Format x value (truncate if too long)
                let xValue = String(data[i].x);
                if (xValue.length > 8) {
                    xValue = xValue.substring(0, 8) + '...';
                }
                text.textContent = xValue;
                plotGroup.appendChild(text);
            }
        });
    }

    createGraphCloseButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'chart-close-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ff4757');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '×';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeGraph(nodeId);
        });
        
        return buttonGroup;
    }

    createGraphClearButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'chart-clear-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ffa502');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '↻';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearGraphData(nodeId);
        });
        
        return buttonGroup;
    }

    removeGraph(nodeId) {
        const existingGraphs = document.querySelectorAll(`.chart-visualization[data-node-id="${nodeId}"]`);
        existingGraphs.forEach(graph => {
            if (graph.parentNode) {
                graph.parentNode.removeChild(graph);
            }
        });
        
        const node = this.nodes.get(nodeId);
        if (node && node.graphs) {
            node.graphs = [];
        }
    }

    clearGraphData(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.graphData = [];
            this.removeGraph(nodeId);
            console.log(`🗑️ Cleared graph data for node "${node.config.name || nodeId}"`);
        }
    }

    executeGraphVizNode(node, message) {
        try {
            const nodeName = node.config.name || node.id;
            console.log(`🕸️ Graph Visualization node "${nodeName}" processing data...`);
            
            // Extract data from message
            let data = message.payload;
            
            // Initialize graph data if it doesn't exist
            if (!node.networkData) {
                node.networkData = { nodes: [], edges: [] };
            }
            
            // Process the data to extract nodes and edges
            this.processNetworkData(node, data);
            
            // Remove existing graph
            this.removeNetworkGraph(node.id);
            
            // Render new graph
            this.renderNetworkGraph(node);
            
            console.log(`✅ Graph Visualization node "${nodeName}" updated with ${node.networkData.nodes.length} nodes, ${node.networkData.edges.length} edges`);
            
        } catch (error) {
            console.error(`❌ Graph Visualization node "${node.config.name || node.id}" error:`, error);
        }
    }

    processNetworkData(node, data) {
        const nodeIdField = node.config.nodeIdField || 'id';
        const nodeLabelField = node.config.nodeLabelField || 'name';
        const edgeSourceField = node.config.edgeSourceField || 'source';
        const edgeTargetField = node.config.edgeTargetField || 'target';
        
        // Clear existing data
        node.networkData = { nodes: [], edges: [] };
        
        if (Array.isArray(data)) {
            // Process array of data
            data.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    this.processDataItem(node, item, nodeIdField, nodeLabelField, edgeSourceField, edgeTargetField);
                }
            });
        } else if (typeof data === 'object' && data !== null) {
            // Handle single object or structured data
            if (data.nodes && data.edges) {
                // Pre-structured graph data
                node.networkData.nodes = data.nodes.map(n => ({
                    id: n[nodeIdField] || n.id,
                    label: n[nodeLabelField] || n.name || n.id,
                    x: Math.random() * 200,
                    y: Math.random() * 150,
                    originalData: n
                }));
                
                node.networkData.edges = data.edges.map(e => ({
                    source: e[edgeSourceField] || e.source,
                    target: e[edgeTargetField] || e.target,
                    originalData: e
                }));
            } else {
                // Single data item
                this.processDataItem(node, data, nodeIdField, nodeLabelField, edgeSourceField, edgeTargetField);
            }
        }
        
        // Apply layout
        this.applyLayout(node);
    }

    processDataItem(node, item, nodeIdField, nodeLabelField, edgeSourceField, edgeTargetField) {
        // Extract node information from the item
        const nodeId = item[nodeIdField];
        const nodeLabel = item[nodeLabelField] || nodeId;
        
        // Add node if it has an ID
        if (nodeId) {
            const existingNode = node.networkData.nodes.find(n => n.id === nodeId);
            if (!existingNode) {
                node.networkData.nodes.push({
                    id: nodeId,
                    label: nodeLabel,
                    x: Math.random() * 200,
                    y: Math.random() * 150,
                    originalData: item
                });
            }
        }
        
        // Extract edge information
        const sourceId = item[edgeSourceField];
        const targetId = item[edgeTargetField];
        
        // Add edge if both source and target exist
        if (sourceId && targetId) {
            const existingEdge = node.networkData.edges.find(e => 
                e.source === sourceId && e.target === targetId
            );
            if (!existingEdge) {
                node.networkData.edges.push({
                    source: sourceId,
                    target: targetId,
                    originalData: item
                });
                
                // Ensure both nodes exist
                [sourceId, targetId].forEach(id => {
                    const existingNode = node.networkData.nodes.find(n => n.id === id);
                    if (!existingNode) {
                        node.networkData.nodes.push({
                            id: id,
                            label: id,
                            x: Math.random() * 200,
                            y: Math.random() * 150,
                            originalData: { [nodeIdField]: id }
                        });
                    }
                });
            }
        }
        
        // Look for nested relationships
        Object.keys(item).forEach(key => {
            const value = item[key];
            if (Array.isArray(value)) {
                // Handle arrays as potential connections
                value.forEach(v => {
                    if (typeof v === 'string' || typeof v === 'number') {
                        // Create edge from current node to array item
                        if (nodeId && v !== nodeId) {
                            const existingEdge = node.networkData.edges.find(e => 
                                e.source === nodeId && e.target === v
                            );
                            if (!existingEdge) {
                                node.networkData.edges.push({
                                    source: nodeId,
                                    target: v,
                                    originalData: { type: 'array_connection', key: key }
                                });
                                
                                // Ensure target node exists
                                const targetNode = node.networkData.nodes.find(n => n.id === v);
                                if (!targetNode) {
                                    node.networkData.nodes.push({
                                        id: v,
                                        label: v,
                                        x: Math.random() * 200,
                                        y: Math.random() * 150,
                                        originalData: { [nodeIdField]: v }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });
    }

    applyLayout(node) {
        const layoutType = node.config.layoutType || 'force';
        const nodes = node.networkData.nodes;
        const width = 250;
        const height = 180;
        
        switch (layoutType) {
            case 'circle':
                this.applyCircleLayout(nodes, width, height);
                break;
            case 'grid':
                this.applyGridLayout(nodes, width, height);
                break;
            case 'force':
            default:
                this.applyForceLayout(node, width, height);
                break;
        }
    }

    applyCircleLayout(nodes, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        
        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
    }

    applyGridLayout(nodes, width, height) {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const cellWidth = width / cols;
        const cellHeight = height / Math.ceil(nodes.length / cols);
        
        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.x = (col + 0.5) * cellWidth;
            node.y = (row + 0.5) * cellHeight;
        });
    }

    applyForceLayout(nodeObj, width, height) {
        const nodes = nodeObj.networkData.nodes;
        const edges = nodeObj.networkData.edges;
        
        // Simple force-directed layout simulation
        const iterations = 50;
        const repulsionStrength = 1000;
        const attractionStrength = 0.1;
        const damping = 0.9;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Apply repulsive forces between all nodes
            nodes.forEach((node, i) => {
                let fx = 0, fy = 0;
                
                nodes.forEach((other, j) => {
                    if (i !== j) {
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                        const force = repulsionStrength / (distance * distance);
                        fx += (dx / distance) * force;
                        fy += (dy / distance) * force;
                    }
                });
                
                node.fx = fx;
                node.fy = fy;
            });
            
            // Apply attractive forces for connected nodes
            edges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                
                if (sourceNode && targetNode) {
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const force = distance * attractionStrength;
                    
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    
                    sourceNode.fx += fx;
                    sourceNode.fy += fy;
                    targetNode.fx -= fx;
                    targetNode.fy -= fy;
                }
            });
            
            // Update positions
            nodes.forEach(node => {
                node.x += node.fx * damping;
                node.y += node.fy * damping;
                
                // Keep within bounds
                node.x = Math.max(20, Math.min(width - 20, node.x));
                node.y = Math.max(20, Math.min(height - 20, node.y));
            });
        }
    }

    renderNetworkGraph(node) {
        if (!node.networkData || node.networkData.nodes.length === 0) {
            console.log('No network data to render');
            return;
        }

        const graphWidth = 300;
        const graphHeight = 220;
        const nodeSize = parseInt(node.config.nodeSize) || 15;
        
        // Create graph container
        const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        graphGroup.setAttribute('class', 'network-graph');
        graphGroup.setAttribute('data-node-id', node.id);
        graphGroup.setAttribute('transform', `translate(${node.x + node.width + 20}, ${node.y})`);
        
        // Background
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', graphWidth);
        background.setAttribute('height', graphHeight);
        background.setAttribute('fill', 'white');
        background.setAttribute('stroke', '#ddd');
        background.setAttribute('stroke-width', '1');
        background.setAttribute('rx', '4');
        graphGroup.appendChild(background);
        
        // Create plot area
        const plotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        plotGroup.setAttribute('transform', `translate(25, 25)`);
        
        // Render edges first (so they appear behind nodes)
        node.networkData.edges.forEach(edge => {
            const sourceNode = node.networkData.nodes.find(n => n.id === edge.source);
            const targetNode = node.networkData.nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourceNode.x);
                line.setAttribute('y1', sourceNode.y);
                line.setAttribute('x2', targetNode.x);
                line.setAttribute('y2', targetNode.y);
                line.setAttribute('stroke', '#999');
                line.setAttribute('stroke-width', '1.5');
                line.setAttribute('opacity', '0.6');
                plotGroup.appendChild(line);
            }
        });
        
        // Render nodes
        node.networkData.nodes.forEach((graphNode, index) => {
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', graphNode.x);
            circle.setAttribute('cy', graphNode.y);
            circle.setAttribute('r', nodeSize);
            circle.setAttribute('fill', this.getNodeColor(index));
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('opacity', '0.8');
            plotGroup.appendChild(circle);
            
            // Node label
            if (node.config.showLabels) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', graphNode.x);
                text.setAttribute('y', graphNode.y + nodeSize + 12);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-family', 'Arial, sans-serif');
                text.setAttribute('font-size', '9px');
                text.setAttribute('fill', '#333');
                text.textContent = this.truncateText(graphNode.label, 40);
                plotGroup.appendChild(text);
            }
        });
        
        graphGroup.appendChild(plotGroup);
        
        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', graphWidth / 2);
        title.setAttribute('y', 15);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-family', 'Arial, sans-serif');
        title.setAttribute('font-size', '12px');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', '#333');
        title.textContent = node.config.name || 'Network Graph';
        graphGroup.appendChild(title);
        
        // Add close button
        const closeButton = this.createNetworkCloseButton(graphWidth - 15, 5, node.id);
        graphGroup.appendChild(closeButton);
        
        // Add clear button
        const clearButton = this.createNetworkClearButton(graphWidth - 35, 5, node.id);
        graphGroup.appendChild(clearButton);
        
        // Add info text
        const infoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        infoText.setAttribute('x', 10);
        infoText.setAttribute('y', graphHeight - 8);
        infoText.setAttribute('font-family', 'Arial, sans-serif');
        infoText.setAttribute('font-size', '8px');
        infoText.setAttribute('fill', '#666');
        infoText.textContent = `${node.networkData.nodes.length} nodes, ${node.networkData.edges.length} edges`;
        graphGroup.appendChild(infoText);
        
        // Add to canvas
        this.nodesLayer.appendChild(graphGroup);
        
        // Store reference
        if (!node.networkGraphs) {
            node.networkGraphs = [];
        }
        node.networkGraphs.push(graphGroup);
    }

    getNodeColor(index) {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        return colors[index % colors.length];
    }

    createNetworkCloseButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'network-close-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ff4757');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '×';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeNetworkGraph(nodeId);
        });
        
        return buttonGroup;
    }

    createNetworkClearButton(x, y, nodeId) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.setAttribute('class', 'network-clear-btn');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#ffa502');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');
        text.textContent = '↻';
        
        buttonGroup.appendChild(circle);
        buttonGroup.appendChild(text);
        
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearNetworkData(nodeId);
        });
        
        return buttonGroup;
    }

    removeNetworkGraph(nodeId) {
        const existingGraphs = document.querySelectorAll(`.network-graph[data-node-id="${nodeId}"]`);
        existingGraphs.forEach(graph => {
            if (graph.parentNode) {
                graph.parentNode.removeChild(graph);
            }
        });
        
        const node = this.nodes.get(nodeId);
        if (node && node.networkGraphs) {
            node.networkGraphs = [];
        }
    }

    clearNetworkData(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.networkData = { nodes: [], edges: [] };
            this.removeNetworkGraph(nodeId);
            console.log(`🗑️ Cleared network data for node "${node.config.name || nodeId}"`);
        }
    }

    flashNode(node) {
        if (!node || !node.element) return;
        
        node.element.classList.add('node-executing');
        setTimeout(() => {
            node.element.classList.remove('node-executing');
        }, 300);
    }

    showExecutionError(node, errorMessage) {
        console.error(`Execution error in node ${node.id}:`, errorMessage);
        // You could add visual error indication here
    }

    addDebugOutput(node, output) {
        // This could add output to a debug console panel
        console.log(`Debug output from ${node.config.name || node.id}:`, output);
    }
}