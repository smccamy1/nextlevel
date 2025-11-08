// Node type definitions
const NODE_TYPES = {
    input: {
        name: 'Input',
        icon: '📥',
        color: '#4a90e2',
        category: 'input',
        inputs: 0,
        outputs: 1,
        defaults: {
            name: '',
            value: ''
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'value', label: 'Initial Value', type: 'text' }
        ]
    },
    trigger: {
        name: 'Trigger',
        icon: '⏰',
        color: '#ff9500',
        category: 'input',
        inputs: 0,
        outputs: 1,
        defaults: {
            name: '',
            interval: '1000',
            repeat: true
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'interval', label: 'Interval (ms)', type: 'number' },
            { name: 'repeat', label: 'Repeat', type: 'checkbox' }
        ]
    },
    exampleData: {
        name: 'Example Data',
        icon: '📦',
        color: '#28a745',
        category: 'input',
        inputs: 0,
        outputs: 1,
        defaults: {
            name: '',
            dataType: 'object',
            payload: '{"temperature": 23.5, "humidity": 65, "timestamp": "2024-01-01T00:00:00Z"}'
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'dataType', label: 'Data Type', type: 'select', options: ['string', 'number', 'boolean', 'object', 'array'] },
            { name: 'payload', label: 'Payload Data', type: 'textarea' }
        ]
    },
    function: {
        name: 'Function',
        icon: '⚙️',
        color: '#7b68ee',
        category: 'function',
        inputs: 1,
        outputs: 1,
        defaults: {
            name: '',
            func: 'return msg;'
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'func', label: 'Function', type: 'textarea' }
        ]
    },
    filter: {
        name: 'Filter',
        icon: '🔍',
        color: '#17a2b8',
        category: 'function',
        inputs: 1,
        outputs: 1,
        defaults: {
            name: '',
            condition: 'msg.payload > 0'
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'condition', label: 'Filter Condition', type: 'text' }
        ]
    },
    transform: {
        name: 'Transform',
        icon: '🔄',
        color: '#6f42c1',
        category: 'function',
        inputs: 1,
        outputs: 1,
        defaults: {
            name: '',
            property: 'payload',
            rules: []
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'property', label: 'Property', type: 'text' }
        ]
    },
    output: {
        name: 'Output',
        icon: '📤',
        color: '#50c878',
        category: 'output',
        inputs: 1,
        outputs: 0,
        defaults: {
            name: '',
            target: 'console'
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'target', label: 'Target', type: 'select', options: ['console', 'file', 'database'] }
        ]
    },
    debug: {
        name: 'Debug',
        icon: '🐛',
        color: '#ff6b6b',
        category: 'output',
        inputs: 1,
        outputs: 0,
        defaults: {
            name: '',
            complete: 'payload',
            console: true
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'complete', label: 'Output', type: 'text' },
            { name: 'console', label: 'To Console', type: 'checkbox' }
        ]
    },
    dataTable: {
        name: 'Data Table',
        icon: '📊',
        color: '#9b59b6',
        category: 'output',
        inputs: 1,
        outputs: 0,
        defaults: {
            name: '',
            maxRows: 10,
            autoWidth: true,
            showHeaders: true,
            appendData: false
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'maxRows', label: 'Max Rows', type: 'number' },
            { name: 'autoWidth', label: 'Auto Width', type: 'checkbox' },
            { name: 'showHeaders', label: 'Show Headers', type: 'checkbox' },
            { name: 'appendData', label: 'Append Data', type: 'checkbox' }
        ]
    },
    chartNode: {
        name: 'Chart',
        icon: '📈',
        color: '#2ecc71',
        category: 'output',
        inputs: 1,
        outputs: 0,
        defaults: {
            name: '',
            chartType: 'line',
            xField: 'timestamp',
            yField: 'value',
            maxPoints: 50,
            autoScale: true,
            showGrid: true
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'chartType', label: 'Chart Type', type: 'select', options: ['line', 'bar', 'scatter', 'area'] },
            { name: 'xField', label: 'X-Axis Field', type: 'text' },
            { name: 'yField', label: 'Y-Axis Field', type: 'text' },
            { name: 'maxPoints', label: 'Max Data Points', type: 'number' },
            { name: 'autoScale', label: 'Auto Scale', type: 'checkbox' },
            { name: 'showGrid', label: 'Show Grid', type: 'checkbox' }
        ]
    },
    graphViz: {
        name: 'Graph Visualization',
        icon: '🕸️',
        color: '#8e44ad',
        category: 'output',
        inputs: 1,
        outputs: 0,
        defaults: {
            name: '',
            nodeIdField: 'id',
            nodeLabelField: 'name',
            edgeSourceField: 'source',
            edgeTargetField: 'target',
            nodeSize: 15,
            showLabels: true,
            layoutType: 'force'
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'nodeIdField', label: 'Node ID Field', type: 'text' },
            { name: 'nodeLabelField', label: 'Node Label Field', type: 'text' },
            { name: 'edgeSourceField', label: 'Edge Source Field', type: 'text' },
            { name: 'edgeTargetField', label: 'Edge Target Field', type: 'text' },
            { name: 'nodeSize', label: 'Node Size', type: 'number' },
            { name: 'showLabels', label: 'Show Labels', type: 'checkbox' },
            { name: 'layoutType', label: 'Layout', type: 'select', options: ['force', 'circle', 'grid'] }
        ]
    },
    networkDataSim: {
        name: 'Network Data Simulation',
        icon: '🔗',
        color: '#e67e22',
        category: 'input',
        inputs: 0,
        outputs: 1,
        defaults: {
            name: '',
            networkType: 'social',
            nodeCount: 8,
            connectivity: 0.3,
            includeAttributes: true
        },
        configFields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'networkType', label: 'Network Type', type: 'select', options: ['social', 'organizational', 'technical', 'random'] },
            { name: 'nodeCount', label: 'Node Count', type: 'number' },
            { name: 'connectivity', label: 'Connectivity (0-1)', type: 'number' },
            { name: 'includeAttributes', label: 'Include Node Attributes', type: 'checkbox' }
        ]
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NODE_TYPES;
}