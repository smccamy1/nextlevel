// Application initialization and event handlers
let flowEditor;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the flow editor
    flowEditor = new FlowEditor('workspace-canvas');
    
    // Expose flowEditor globally for debug panel access
    window.flowEditor = flowEditor;
    
    // Initialize UI components
    initializeToolbar();
    initializeModal();
    initializeSearch();
    initializeKeyboardShortcuts();
    initializeExecutionFeedback();
    
    console.log('Flow Editor initialized');
});

function initializeToolbar() {
    // Deploy button
    document.getElementById('deploy-btn').addEventListener('click', function() {
        const flow = flowEditor.exportFlow();
        console.log('Deploying flow:', flow);
        // Here you would typically send the flow to a backend service
        showNotification('Flow deployed successfully!', 'success');
    });
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', function() {
        const flow = flowEditor.exportFlow();
        localStorage.setItem('savedFlow', flow);
        showNotification('Flow saved to local storage!', 'success');
    });
    
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the entire flow?')) {
            flowEditor.clearAll();
            showNotification('Flow cleared!', 'info');
        }
    });
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', function() {
        flowEditor.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        flowEditor.zoomOut();
    });
    
    document.getElementById('zoom-fit').addEventListener('click', function() {
        flowEditor.zoomFit();
    });
}

function initializeModal() {
    const modal = document.getElementById('node-config-modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save');
    
    // Close modal events
    closeBtn.addEventListener('click', function() {
        flowEditor.closeModal();
    });
    
    cancelBtn.addEventListener('click', function() {
        flowEditor.closeModal();
    });
    
    // Save configuration
    saveBtn.addEventListener('click', function() {
        flowEditor.saveNodeConfig();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            flowEditor.closeModal();
        }
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('node-search');
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const paletteNodes = document.querySelectorAll('.palette-node');
        
        paletteNodes.forEach(node => {
            const nodeText = node.textContent.toLowerCase();
            const isVisible = nodeText.includes(searchTerm);
            node.style.display = isVisible ? 'flex' : 'none';
        });
        
        // Show/hide categories based on visible nodes
        const categories = document.querySelectorAll('.palette-category');
        categories.forEach(category => {
            const visibleNodes = category.querySelectorAll('.palette-node[style*="flex"]').length;
            const allNodes = category.querySelectorAll('.palette-node');
            const hasVisibleNodes = searchTerm === '' || visibleNodes > 0;
            category.style.display = hasVisibleNodes ? 'block' : 'none';
        });
    });
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Prevent default browser shortcuts when focus is on editor
        if (e.target === document.body || e.target.closest('.editor-container')) {
            switch(e.key) {
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('save-btn').click();
                    }
                    break;
                case 'd':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('deploy-btn').click();
                    }
                    break;
                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        selectAllNodes();
                    }
                    break;
                case '=':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        flowEditor.zoomIn();
                    }
                    break;
                case '-':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        flowEditor.zoomOut();
                    }
                    break;
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        flowEditor.zoomFit();
                    }
                    break;
            }
        }
    });
}

function initializeExecutionFeedback() {
    // Override the executeExampleDataNode method to add UI feedback
    if (window.flowEditor) {
        const originalExecute = flowEditor.executeExampleDataNode.bind(flowEditor);
        flowEditor.executeExampleDataNode = function(node) {
            showNotification(`Executing: ${node.config.name || 'Example Data'}`, 'info');
            return originalExecute(node);
        };
    }
}

function selectAllNodes() {
    // Implementation for selecting all nodes
    console.log('Select all nodes');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '4px',
        color: 'white',
        zIndex: '1000',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '200px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    });
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Utility functions
function loadFlow() {
    const savedFlow = localStorage.getItem('savedFlow');
    if (savedFlow) {
        flowEditor.importFlow(savedFlow);
        showNotification('Flow loaded from local storage!', 'success');
    }
}

function downloadFlow() {
    const flow = flowEditor.exportFlow();
    const blob = new Blob([flow], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Flow downloaded!', 'success');
}

function uploadFlow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    flowEditor.importFlow(e.target.result);
                    showNotification('Flow uploaded successfully!', 'success');
                } catch (error) {
                    showNotification('Failed to load flow file!', 'error');
                }
            };
            reader.readAsText(file);
        }
    });
    
    input.click();
}

// Add context menu for additional actions
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    // Could implement a context menu here
});

// Window resize handler
window.addEventListener('resize', function() {
    // Handle canvas resize if needed
    console.log('Window resized');
});

// Export functions for potential use in console or external scripts
window.FlowEditor = {
    instance: () => flowEditor,
    loadFlow,
    downloadFlow,
    uploadFlow,
    showNotification
};