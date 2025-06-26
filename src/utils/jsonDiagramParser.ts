import { NodeModel, ConnectorModel, HorizontalAlignment, VerticalAlignment } from '@syncfusion/ej2-react-diagrams';

interface DiagramNode extends NodeModel {
  id: string;
  width?: number;
  height?: number;
  annotations?: Array<{
    id?: string;
    content: string;
    offset?: { x: number; y: number };
    style?: any;
    margin?: any;
    horizontalAlignment?: HorizontalAlignment;
    verticalAlignment?: VerticalAlignment;
    visibility?: boolean;
  }>;
  additionalInfo?: {
    isLeaf: boolean;
    mergedContent?: string;
  };
  data?: {
    path: string;
    title: string;
    actualdata: string;
    displayContent?: {
      key: string[];
      displayValue: number;
    };
  };
}

interface DiagramConnector extends ConnectorModel {
  id: string;
  sourceID: string;
  targetID: string;
}

interface DiagramData {
  nodes: DiagramNode[];
  connectors: DiagramConnector[];
}

// Constants for better maintainability
const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;
const ARTIFICIAL_ROOT_SIZE = 40;
const ROOT_IDENTIFIERS = {
  DEFAULT: 'root',
  DATA_ROOT: 'data-root',
  MAIN_ROOT: 'main-root'
} as const;

class JsonDiagramParser {
    // Generate a random ID suffix for unique node identification
    static randomId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // Process input JSON object and return diagram data
    static processData(inputJsonData: any): DiagramData {
        const parsedDiagramData: DiagramData = { nodes: [], connectors: [] };
        
        // Validate input data
        if (!JsonDiagramParser.isValidInputData(inputJsonData)) {
            return parsedDiagramData;
        }

        // Process root node structure
        const rootProcessingResult = JsonDiagramParser.processRootStructure(inputJsonData);
        const { processedData, rootNodeIdentifier, shouldSkipEmptyRoot } = rootProcessingResult;

        // Separate primitive and nested keys
        const keyCategories = JsonDiagramParser.categorizeKeys(processedData);
        const { primitiveValueKeys, nestedObjectKeys } = keyCategories;

        // Process primitive values at root level
        let finalRootIdentifier = rootNodeIdentifier;
        if (primitiveValueKeys.length > 0) {
            finalRootIdentifier = JsonDiagramParser.createRootNodeWithPrimitives(
                parsedDiagramData,
                processedData,
                primitiveValueKeys,
                rootNodeIdentifier,
                shouldSkipEmptyRoot
            );
        }

        // Process nested objects
        const isRootNodeCreated = primitiveValueKeys.length > 0;
        JsonDiagramParser.processNestedObjects(
            parsedDiagramData,
            processedData,
            nestedObjectKeys,
            finalRootIdentifier,
            isRootNodeCreated
        );

        // Handle multiple roots scenario
        JsonDiagramParser.handleMultipleRoots(parsedDiagramData, shouldSkipEmptyRoot, isRootNodeCreated);

        return parsedDiagramData;
    }

    // Validate if input data is processable
    static isValidInputData(inputJsonData: any): boolean {
        return inputJsonData && 
               typeof inputJsonData === 'object' && 
               !Array.isArray(inputJsonData) && 
               Object.keys(inputJsonData).length > 0;
    }

    // Process root structure and determine root identifier
    static processRootStructure(inputJsonData: any): { processedData: any, rootNodeIdentifier: string, shouldSkipEmptyRoot: boolean } {
        let rootNodeIdentifier = ROOT_IDENTIFIERS.DEFAULT;
        const jsonObjectKeys = Object.keys(inputJsonData);
        let shouldSkipEmptyRoot = false;
        let processedData = inputJsonData;

        if (jsonObjectKeys.length === 1) {
            const singleRootKey = jsonObjectKeys[0];
            const singleRootValue = inputJsonData[singleRootKey];
            
            if (JsonDiagramParser.isEmptyOrWhitespace(singleRootKey) && 
                singleRootValue && typeof singleRootValue === 'object') {
                // Skip empty root and process children directly
                shouldSkipEmptyRoot = true;
                processedData = singleRootValue;
            } else if (!JsonDiagramParser.isEmptyOrWhitespace(singleRootKey) && 
                       singleRootValue && typeof singleRootValue === 'object') {
                rootNodeIdentifier = singleRootKey as any;
            }
        }

        return { processedData, rootNodeIdentifier, shouldSkipEmptyRoot };
    }

    // Categorize keys into primitive values and nested objects
    static categorizeKeys(data: any): { primitiveValueKeys: string[], nestedObjectKeys: string[] } {
        const jsonObjectKeys = Object.keys(data);
        const nestedObjectKeys: string[] = [];
        const primitiveValueKeys: string[] = [];
        
        jsonObjectKeys.forEach(keyName => {
            const keyValue = data[keyName];
            if (keyValue !== null && typeof keyValue === 'object') {
                nestedObjectKeys.push(keyName);
            } else {
                primitiveValueKeys.push(keyName);
            }
        });

        return { primitiveValueKeys, nestedObjectKeys };
    }

    // Create root node with primitive values
    static createRootNodeWithPrimitives(
        parsedDiagramData: DiagramData,
        processedData: any,
        primitiveValueKeys: string[],
        rootNodeIdentifier: string,
        shouldSkipEmptyRoot: boolean
    ): string {
        // Determine final root identifier
        const finalRootIdentifier = shouldSkipEmptyRoot 
            ? ROOT_IDENTIFIERS.DATA_ROOT 
            : JsonDiagramParser.convertUnderScoreToPascalCase(rootNodeIdentifier);

        const uniqueRootNodeId = `${finalRootIdentifier}-${JsonDiagramParser.randomId()}`;

        // Build annotations for key-value pairs
        const primitiveLeafAnnotations = JsonDiagramParser.buildPrimitiveAnnotations(processedData, primitiveValueKeys);

        // Create combined content string
        const combinedPrimitiveContent = primitiveValueKeys
            .map(keyName => `${keyName}: ${processedData[keyName]}`)
            .join('\n');

        // Create root node
        const rootLeafNode: DiagramNode = {
            id: uniqueRootNodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: primitiveLeafAnnotations,
            additionalInfo: { isLeaf: true },
            data: {
                path: 'Root',
                title: combinedPrimitiveContent,
                actualdata: combinedPrimitiveContent
            }
        };
        
        parsedDiagramData.nodes.push(rootLeafNode);
        return uniqueRootNodeId;
    }

    // Build annotations for primitive key-value pairs
    static buildPrimitiveAnnotations(data: any, primitiveKeys: string[]): any[] {
        return primitiveKeys.flatMap(keyName => {
            const formattedValue = data[keyName] == null ? '' : String(data[keyName]);
            return [
                { id: `Key_${keyName}`, content: `${keyName}:` },
                { id: `Value_${keyName}`, content: formattedValue }
            ];
        });
    }

    // Process nested objects and create nodes
    static processNestedObjects(
        parsedDiagramData: DiagramData,
        processedData: any,
        nestedObjectKeys: string[],
        rootNodeIdentifier: string,
        isRootNodeCreated: boolean
    ): void {
        nestedObjectKeys.forEach(nestedKeyName => {
            if (JsonDiagramParser.isEmpty(processedData[nestedKeyName])) return;

            const nestedNodeId = JsonDiagramParser.convertUnderScoreToPascalCase(nestedKeyName);
            const nestedChildCount = JsonDiagramParser.getObjectLength(processedData[nestedKeyName]);
            
            // Create nested object node
            const nestedObjectNode = JsonDiagramParser.createNestedObjectNode(
                nestedNodeId,
                nestedKeyName,
                nestedChildCount
            );
            parsedDiagramData.nodes.push(nestedObjectNode);

            // Connect to root if root exists
            if (isRootNodeCreated) {
                parsedDiagramData.connectors.push({
                    id: `connector-${rootNodeIdentifier}-${nestedNodeId}`,
                    sourceID: rootNodeIdentifier,
                    targetID: nestedNodeId
                });
            }

            // Process nested data recursively
            JsonDiagramParser.processNestedData(
                processedData[nestedKeyName],
                nestedNodeId,
                parsedDiagramData.nodes,
                parsedDiagramData.connectors,
                `Root.${nestedKeyName}`,
                nestedKeyName
            );
        });
    }

    // Create a nested object node
    static createNestedObjectNode(nodeId: string, keyName: string, childCount: number): DiagramNode {
        const annotations = [{ content: keyName }];
        if (childCount > 0) annotations.push({ content: `{${childCount}}` });

        return {
            id: nodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: annotations,
            additionalInfo: { isLeaf: false, mergedContent: `${keyName} {${childCount}}` },
            data: {
                path: `Root.${keyName}`,
                title: keyName,
                actualdata: keyName,
                displayContent: { key: [keyName], displayValue: childCount }
            }
        };
    }

    // Handle multiple roots scenario
    static handleMultipleRoots(parsedDiagramData: DiagramData, shouldSkipEmptyRoot: boolean, isRootNodeCreated: boolean): void {
        if ((shouldSkipEmptyRoot || JsonDiagramParser.hasMultipleRoots(parsedDiagramData.nodes, parsedDiagramData.connectors)) 
            && !isRootNodeCreated) {
            JsonDiagramParser.checkMultiRoot(parsedDiagramData.nodes, parsedDiagramData.connectors);
        }
    }

    // Recursively process nested objects/arrays
    static processNestedData(nestedElement: any, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string): void {
        if (!nestedElement || typeof nestedElement !== 'object') return;

        if (Array.isArray(nestedElement)) {
            JsonDiagramParser.processArrayElements(nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName);
        } else {
            JsonDiagramParser.processObjectProperties(nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath);
        }
    }

    // Process array elements
    static processArrayElements(nestedElement: any[], parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string): void {
        nestedElement.forEach((arrayItem, arrayIndex) => {
            if (arrayItem == null) return;
            
            const arrayItemNodeId = JsonDiagramParser.convertUnderScoreToPascalCase(`${parentNodeId}-${arrayIndex}`);

            if (arrayItem && typeof arrayItem === 'object' && !Array.isArray(arrayItem)) {
                JsonDiagramParser.processComplexArrayItem(arrayItem, arrayItemNodeId, arrayIndex, parentNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName);
            } else {
                JsonDiagramParser.processPrimitiveArrayItem(arrayItem, arrayItemNodeId, arrayIndex, parentNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName);
            }
        });
    }

    // Process complex array item (object)
    static processComplexArrayItem(arrayItem: any, arrayItemNodeId: string, arrayIndex: number, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string): void {
        const objectPropertyEntries = Object.entries(arrayItem);
        const primitivePropertyEntries = objectPropertyEntries.filter(([, propertyValue]) => propertyValue === null || typeof propertyValue !== 'object');
        const nestedPropertyEntries = objectPropertyEntries.filter(([, propertyValue]) => propertyValue && typeof propertyValue === 'object' && !JsonDiagramParser.isEmpty(propertyValue));

        const requiresIntermediateNode = primitivePropertyEntries.length > 0 || nestedPropertyEntries.length > 1;

        if (requiresIntermediateNode) {
            JsonDiagramParser.createIntermediateArrayNode(arrayItem, arrayItemNodeId, arrayIndex, parentNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName, primitivePropertyEntries, nestedPropertyEntries);
        } else {
            JsonDiagramParser.createDirectArrayConnection(arrayItemNodeId, arrayIndex, parentNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName, nestedPropertyEntries);
        }
    }

    // Create intermediate node for complex array item
    static createIntermediateArrayNode(arrayItem: any, arrayItemNodeId: string, arrayIndex: number, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string, primitivePropertyEntries: any[], nestedPropertyEntries: any[]): void {
        let intermediateNodeContent: string;
        let isIntermediateLeafNode: boolean;
        let intermediateNodeAnnotations: any[];
        let finalArrayItemNodeId = arrayItemNodeId;

        if (primitivePropertyEntries.length > 0) {
            // Create leaf node with primitives
            isIntermediateLeafNode = true;
            finalArrayItemNodeId = `${arrayItemNodeId}-${JsonDiagramParser.randomId()}`;
            
            const primitiveAnnotationsForItem = primitivePropertyEntries.flatMap(([propertyKey, propertyValue]) => [
                { id: `Key_${finalArrayItemNodeId}_${propertyKey}`, content: `${propertyKey}:` },
                { id: `Value_${finalArrayItemNodeId}_${propertyKey}`, content: String(propertyValue) }
            ]);
            
            intermediateNodeContent = primitivePropertyEntries.map(([propertyKey, propertyValue]) => `${propertyKey}: ${propertyValue}`).join('\n');
            intermediateNodeAnnotations = primitiveAnnotationsForItem;
        } else {
            // Create container node
            isIntermediateLeafNode = false;
            intermediateNodeContent = `Item ${arrayIndex}`;
            intermediateNodeAnnotations = [{ content: intermediateNodeContent }];
        }

        // Create intermediate node
        const arrayItemIntermediateNode: DiagramNode = {
            id: finalArrayItemNodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: intermediateNodeAnnotations,
            additionalInfo: { isLeaf: isIntermediateLeafNode },
            data: {
                path: `${currentPath}/${parentKeyName}[${arrayIndex}]`,
                title: intermediateNodeContent,
                actualdata: intermediateNodeContent
            }
        };

        diagramNodes.push(arrayItemIntermediateNode);
        diagramConnectors.push({
            id: `connector-${parentNodeId}-${finalArrayItemNodeId}`,
            sourceID: parentNodeId,
            targetID: finalArrayItemNodeId
        });

        // Process nested properties
        JsonDiagramParser.processNestedArrayProperties(nestedPropertyEntries, finalArrayItemNodeId, diagramNodes, diagramConnectors, currentPath, parentKeyName, arrayIndex);
    }

    // Process nested properties of array items
    static processNestedArrayProperties(nestedPropertyEntries: any[], finalArrayItemNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string, arrayIndex: number): void {
        nestedPropertyEntries.forEach(([nestedPropertyKey, nestedPropertyValue]) => {
            const nestedPropertyNodeId = JsonDiagramParser.convertUnderScoreToPascalCase(`${finalArrayItemNodeId}-${nestedPropertyKey}`);
            const nestedPropertyChildCount = JsonDiagramParser.getObjectLength(nestedPropertyValue);
            const nestedPropertyAnnotations = [{ content: nestedPropertyKey }];
            if (nestedPropertyChildCount > 0) nestedPropertyAnnotations.push({ content: `{${nestedPropertyChildCount}}` });

            const nestedPropertyNode: DiagramNode = {
                id: nestedPropertyNodeId,
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                annotations: nestedPropertyAnnotations,
                additionalInfo: { isLeaf: false, mergedContent: `${nestedPropertyKey} {${nestedPropertyChildCount}}` },
                data: {
                    path: `${currentPath}/${parentKeyName}[${arrayIndex}].${nestedPropertyKey}`,
                    title: nestedPropertyKey,
                    actualdata: nestedPropertyKey
                }
            };
            
            diagramNodes.push(nestedPropertyNode);
            diagramConnectors.push({
                id: `connector-${finalArrayItemNodeId}-${nestedPropertyNodeId}`,
                sourceID: finalArrayItemNodeId,
                targetID: nestedPropertyNodeId
            });

            JsonDiagramParser.processNestedData(
                nestedPropertyValue,
                nestedPropertyNodeId,
                diagramNodes,
                diagramConnectors,
                `${currentPath}/${parentKeyName}[${arrayIndex}].${nestedPropertyKey}`,
                nestedPropertyKey
            );
        });
    }

    // Create direct connection for single nested array item
    static createDirectArrayConnection(arrayItemNodeId: string, arrayIndex: number, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string, nestedPropertyEntries: any[]): void {
        const [singleNestedKey, singleNestedValue] = nestedPropertyEntries[0];
        const directNestedNodeId = JsonDiagramParser.convertUnderScoreToPascalCase(`${arrayItemNodeId}-${singleNestedKey}`);
        const directNestedChildCount = JsonDiagramParser.getObjectLength(singleNestedValue);
        const directNestedAnnotations = [{ content: singleNestedKey }];
        if (directNestedChildCount > 0) directNestedAnnotations.push({ content: `{${directNestedChildCount}}` });

        const directConnectionNode: DiagramNode = {
            id: directNestedNodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: directNestedAnnotations,
            additionalInfo: { isLeaf: false, mergedContent: `${singleNestedKey} {${directNestedChildCount}}` },
            data: {
                path: `${currentPath}/${parentKeyName}[${arrayIndex}].${singleNestedKey}`,
                title: singleNestedKey,
                actualdata: singleNestedKey
            }
        };
        
        diagramNodes.push(directConnectionNode);
        diagramConnectors.push({
            id: `connector-${parentNodeId}-${directNestedNodeId}`,
            sourceID: parentNodeId,
            targetID: directNestedNodeId
        });

        JsonDiagramParser.processNestedData(
            singleNestedValue,
            directNestedNodeId,
            diagramNodes,
            diagramConnectors,
            `${currentPath}/${parentKeyName}[${arrayIndex}].${singleNestedKey}`,
            singleNestedKey
        );
    }

    // Process primitive array item
    static processPrimitiveArrayItem(arrayItem: any, arrayItemNodeId: string, arrayIndex: number, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string, parentKeyName: string): void {
        const primitiveArrayContent = String(arrayItem);
        const uniqueArrayItemNodeId = `${arrayItemNodeId}-${JsonDiagramParser.randomId()}`;
        
        const primitiveArrayNode: DiagramNode = {
            id: uniqueArrayItemNodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: [{ content: primitiveArrayContent }],
            additionalInfo: { isLeaf: true },
            data: {
                path: `${currentPath}/${parentKeyName}[${arrayIndex}]`,
                title: primitiveArrayContent,
                actualdata: primitiveArrayContent
            }
        };
        
        diagramNodes.push(primitiveArrayNode);
        diagramConnectors.push({
            id: `connector-${parentNodeId}-${uniqueArrayItemNodeId}`,
            sourceID: parentNodeId,
            targetID: uniqueArrayItemNodeId
        });
    }

    // Process object properties
    static processObjectProperties(nestedElement: any, parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string): void {
        const objectPropertyEntries = Object.entries(nestedElement);
        const primitiveObjectKeys = objectPropertyEntries
            .filter(([, propertyValue]) => propertyValue === null || typeof propertyValue !== 'object')
            .map(([propertyKey]) => propertyKey);
        const nestedObjectKeys = objectPropertyEntries
            .filter(([, propertyValue]) => propertyValue && typeof propertyValue === 'object')
            .map(([propertyKey]) => propertyKey);

        // Process primitive properties
        if (primitiveObjectKeys.length > 0) {
            JsonDiagramParser.createPrimitiveObjectLeafNode(nestedElement, primitiveObjectKeys, parentNodeId, diagramNodes, diagramConnectors, currentPath);
        }

        // Process nested object properties
        JsonDiagramParser.processNestedObjectProperties(nestedElement, nestedObjectKeys, parentNodeId, diagramNodes, diagramConnectors, currentPath);
    }

    // Create leaf node for primitive object properties
    static createPrimitiveObjectLeafNode(nestedElement: any, primitiveObjectKeys: string[], parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string): void {
        const primitiveLeafNodeId = `${parentNodeId}-leaf-${JsonDiagramParser.randomId()}`;
        
        const primitiveObjectAnnotations = primitiveObjectKeys.flatMap(primitiveKey => {
            const primitiveRawValue = nestedElement[primitiveKey] == null ? '' : String(nestedElement[primitiveKey]);
            return [
                { id: `Key_${primitiveLeafNodeId}_${primitiveKey}`, content: `${primitiveKey}:` },
                { id: `Value_${primitiveLeafNodeId}_${primitiveKey}`, content: primitiveRawValue }
            ];
        });

        const combinedPrimitiveObjectContent = primitiveObjectKeys
            .map(primitiveKey => `${primitiveKey}: ${nestedElement[primitiveKey]}`)
            .join('\n');

        const primitiveObjectLeafNode: DiagramNode = {
            id: primitiveLeafNodeId,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            annotations: primitiveObjectAnnotations,
            additionalInfo: { isLeaf: true },
            data: {
                path: `${currentPath}.leaf`,
                title: combinedPrimitiveObjectContent,
                actualdata: combinedPrimitiveObjectContent
            }
        };
        
        diagramNodes.push(primitiveObjectLeafNode);
        diagramConnectors.push({
            id: `connector-${parentNodeId}-${primitiveLeafNodeId}`,
            sourceID: parentNodeId,
            targetID: primitiveLeafNodeId
        });
    }

    // Process nested object properties recursively
    static processNestedObjectProperties(nestedElement: any, nestedObjectKeys: string[], parentNodeId: string, diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[], currentPath: string): void {
        nestedObjectKeys.forEach(nestedObjectProperty => {
            const nestedObjectPropertyValue = nestedElement[nestedObjectProperty];
            if (JsonDiagramParser.isEmpty(nestedObjectPropertyValue)) return;
            
            const nestedObjectPropertyChildCount = JsonDiagramParser.getObjectLength(nestedObjectPropertyValue);
            const nestedObjectPropertyNodeId = JsonDiagramParser.convertUnderScoreToPascalCase(`${parentNodeId}-${nestedObjectProperty}`);
            const nestedObjectPropertyAnnotations = [{ content: nestedObjectProperty }];
            if (nestedObjectPropertyChildCount > 0) nestedObjectPropertyAnnotations.push({ content: `{${nestedObjectPropertyChildCount}}` });

            const nestedObjectPropertyNode: DiagramNode = {
                id: nestedObjectPropertyNodeId,
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                annotations: nestedObjectPropertyAnnotations,
                additionalInfo: { isLeaf: false, mergedContent: `${nestedObjectProperty} {${nestedObjectPropertyChildCount}}` },
                data: {
                    path: `${currentPath}.${nestedObjectProperty}`,
                    title: nestedObjectProperty,
                    actualdata: nestedObjectProperty
                }
            };
            
            diagramNodes.push(nestedObjectPropertyNode);
            diagramConnectors.push({
                id: `connector-${parentNodeId}-${nestedObjectPropertyNodeId}`,
                sourceID: parentNodeId,
                targetID: nestedObjectPropertyNodeId
            });
            
            JsonDiagramParser.processNestedData(
                nestedObjectPropertyValue,
                nestedObjectPropertyNodeId,
                diagramNodes,
                diagramConnectors,
                `${currentPath}.${nestedObjectProperty}`,
                nestedObjectProperty
            );
        });
    }

    // Check if there are multiple root nodes (nodes without parents)
    static hasMultipleRoots(diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[]): boolean {
        const allNodeIds = diagramNodes.map(diagramNode => diagramNode.id);
        const connectedNodeIds = new Set(diagramConnectors.map(connector => connector.targetID));
        const rootNodeIds = allNodeIds.filter(nodeId => !connectedNodeIds.has(nodeId));
        return rootNodeIds.length > 1;
    }

    // Add an artificial main root if multiple roots exist
    static checkMultiRoot(diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[]): void {
        const allNodeIds = diagramNodes.map(diagramNode => diagramNode.id);
        const connectedNodeIds = new Set(diagramConnectors.map(connector => connector.targetID));
        const rootNodeIds = allNodeIds.filter(nodeId => !connectedNodeIds.has(nodeId));
        
        if (rootNodeIds.length > 1) {
            const artificialMainRootId = ROOT_IDENTIFIERS.MAIN_ROOT;
            
            const artificialMainRootNode: DiagramNode = {
                id: artificialMainRootId,
                width: ARTIFICIAL_ROOT_SIZE,
                height: ARTIFICIAL_ROOT_SIZE,
                annotations: [{ content: '' }],
                additionalInfo: { isLeaf: false },
                data: { path: 'MainRoot', title: 'Main Artificial Root', actualdata: '' }
            };
            
            diagramNodes.push(artificialMainRootNode);
            
            // Connect all root nodes to artificial main root
            rootNodeIds.forEach(rootNodeId => {
                diagramConnectors.push({
                    id: `connector-${artificialMainRootId}-${rootNodeId}`,
                    sourceID: artificialMainRootId,
                    targetID: rootNodeId
                });
            });
        }
    }

    // Return count of children for objects/arrays
    static getObjectLength(targetElement: any): number {
        if (!targetElement || typeof targetElement !== 'object') return 0;
        if (Array.isArray(targetElement)) return targetElement.length;

        const elementPropertyEntries = Object.entries(targetElement);
        const primitivePropertyEntries = elementPropertyEntries.filter(([, propertyValue]) => propertyValue === null || typeof propertyValue !== 'object');
        const arrayPropertyEntries = elementPropertyEntries.filter(([, propertyValue]) => Array.isArray(propertyValue));
        const objectPropertyEntries = elementPropertyEntries.filter(
            ([, propertyValue]) => propertyValue && typeof propertyValue === 'object' && !Array.isArray(propertyValue)
        );

        return (primitivePropertyEntries.length > 0 ? 1 : 0) + arrayPropertyEntries.length + objectPropertyEntries.length;
    }

    // Convert strings from underscore/hyphen to PascalCase segments
    static convertUnderScoreToPascalCase(inputString: string): string {
        if (!inputString) return inputString;
        return inputString
            .split('-')
            .map(hyphenSeparatedPart =>
                hyphenSeparatedPart
                    .split('_')
                    .map((underscoreSeparatedWord, wordIndex) =>
                        wordIndex > 0
                            ? underscoreSeparatedWord.charAt(0).toUpperCase() + underscoreSeparatedWord.slice(1).toLowerCase()
                            : underscoreSeparatedWord
                    )
                    .join('')
            )
            .join('-');
    }

    // Check if a value is an empty array, an empty object, or not set
    static isEmpty(valueToCheck: any): boolean {
        if (Array.isArray(valueToCheck)) return valueToCheck.length === 0;
        if (valueToCheck && typeof valueToCheck === 'object') return Object.keys(valueToCheck).length === 0;
        return false;
    }

    // Check if a string is empty or contains only whitespace
    static isEmptyOrWhitespace(stringToCheck: string): boolean {
        return !stringToCheck || stringToCheck.trim().length === 0;
    }
}

export default JsonDiagramParser;