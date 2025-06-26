import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DiagramComponent,
  Inject,
  DataBinding,
  HierarchicalTree,
  PrintAndExport,
  NodeModel,
  ConnectorModel,
  DiagramTools,
  NodeConstraints,
  ConnectorConstraints,
  ConnectionPointOrigin,
  LineDistribution,
  SnapConstraints,
} from "@syncfusion/ej2-react-diagrams";
import Editor from "@monaco-editor/react";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

// Components
import NavMenu from "./components/NavMenu/NavMenu";
import Toolbar from "./components/Toolbar/Toolbar";
import HamburgerMenu from "./components/HamburgerMenu/HamburgerMenu";
import ExportDialog from "./components/ExportDialog/ExportDialog";
import NodeDetailsDialog from "./components/NodeDetailsDialog/NodeDetailsDialog";
import Resizer from "./components/Resizer/Resizer";
import Spinner from "./components/Spinner/Spinner";

// Services and Context
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import JsonDiagramParser from "./utils/jsonDiagramParser";


// Styles
import "./App.css";

// Sample data
import sampleData from "./assets/sample.json";

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

// Types
export type EditorType = 'json' | 'xml';
export type ThemeType = 'light' | 'dark';

const DIAGRAM_CONSTANTS = {
  ZOOM_STEP_FACTOR: 0.2,
  FONT_SPECIFICATION: "12px Consolas",
  TEXT_LINE_HEIGHT: 16,
  ANNOTATIONS_PADDING: 10,
  EXPAND_COLLAPSE_ICON_WIDTH: 36,
  NODE_CORNER_RADIUS: 3,
  MAIN_ROOT_SIZE: 40,
  MIN_NODE_WIDTH: 50,
  MIN_NODE_HEIGHT: 40,
  DEFAULT_NODE_WIDTH: 150,
} as const;

const LAYOUT_ORIENTATIONS = ["LeftToRight", "TopToBottom", "RightToLeft", "BottomToTop"] as const;

const AppContent: React.FC = () => {
  const { theme, themeSettings, setTheme } = useTheme();
  const currentThemeSettingsRef = useRef(themeSettings);
  const diagramComponentRef = useRef<DiagramComponent>(null);

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  // Editor state management
  const [editorTextContent, setEditorTextContent] = useState("");
  const [selectedEditorType, setSelectedEditorType] = useState<EditorType>("json");
  const [isEditorContentValid, setIsEditorContentValid] = useState(true);

  // UI state management
  const [isLoadingSpinnerVisible, setIsLoadingSpinnerVisible] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isNodeDetailsDialogOpen, setIsNodeDetailsDialogOpen] = useState(false);
  const [selectedNodeDetailsData, setSelectedNodeDetailsData] = useState({
    content: "",
    path: "",
  });

  // Diagram state management
  const [diagramNodes, setDiagramNodes] = useState<NodeModel[]>([]);
  const [diagramConnectors, setDiagramConnectors] = useState<ConnectorModel[]>([]);
  const [totalNodeCount, setTotalNodeCount] = useState(0);

  // View options state
  const [isEntireGraphCollapsed, setIsEntireGraphCollapsed] = useState(false);
  const [shouldDisplayExpandCollapseIcons, setShouldDisplayExpandCollapseIcons] = useState(true);
  const [shouldShowChildItemsCount, setShouldShowChildItemsCount] = useState(true);
  const [shouldShowGridLines, setShouldShowGridLines] = useState(true);

  // Search functionality state
  const [searchResultMatches, setSearchResultMatches] = useState<string[]>([]);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0);

  // Layout orientation management
  const [currentLayoutOrientationIndex, setCurrentLayoutOrientationIndex] = useState(0);

  // =============================================================================
  // XML PARSER CONFIGURATION
  // =============================================================================
  
  // Configure XML to JSON parser with specific settings for diagram processing
  const xmlToJsonParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    isArray: () => false,
  });

  // =============================================================================
  // INITIALIZATION AND SETUP
  // =============================================================================

  // Update theme settings reference when theme changes
  useEffect(() => {
    currentThemeSettingsRef.current = themeSettings;
  }, [theme, themeSettings]);

  // Initialize application with sample data on component mount
  useEffect(() => {
    const initialJsonContent = JSON.stringify(sampleData, null, 2);
    setEditorTextContent(initialJsonContent);
    parseAndProcessEditorContent(initialJsonContent, "json");
  }, []);

  // Clear the search input in the toolbar component
  const clearToolbarSearchInput = () => {
    if ((window as any).clearSearchInput) {
      (window as any).clearSearchInput();
    }
  };

  // =============================================================================
  // EDITOR CONTENT PROCESSING
  // =============================================================================

  // Parse and process editor content with loading state management and error handling
  const parseAndProcessEditorContent = (textContent: string, editorType: EditorType) => {
    setIsLoadingSpinnerVisible(true);
    try {
      let parsedDiagramData = processEditorContent(textContent, editorType);
      if (parsedDiagramData) {
        if (diagramComponentRef.current && (parsedDiagramData.nodes.length || parsedDiagramData.connectors.length)) {
          // clear the diagram
          diagramComponentRef.current.nodes = [];
          diagramComponentRef.current.connectors = [];
          // Update Nodes
          diagramComponentRef.current.addElements(parsedDiagramData.nodes);
          // Update Connectors
          diagramComponentRef.current.addElements(parsedDiagramData.connectors);
          // Update node count in status bar
          setTotalNodeCount(parsedDiagramData.nodes?.length || 0);
          // Update the status bar as valid data
          setIsEditorContentValid(true);
          setIsLoadingSpinnerVisible(false);
          clearToolbarSearchInput();
        }
      }
    } catch (error) {
      console.error("Invalid Content:", error);
      // Update the status bar as invalid data
      setIsEditorContentValid(false);
    }
  };

  // Process editor content based on type (JSON or XML) and convert to diagram data
  const processEditorContent = (textContent: string, editorType: EditorType) => {
    if (editorType === "json") {
      const parsedJsonObject = JSON.parse(textContent);
      return JsonDiagramParser.processData(parsedJsonObject);
    } else if (editorType === "xml") {
      if (!textContent.trim().startsWith("<")) {
        throw new Error("Invalid XML format");
      }
      // Wrap XML content in root element for proper parsing
      const wrappedXmlContent = `<root>${textContent}</root>`;
      const convertedJsonObject = xmlToJsonParser.parse(wrappedXmlContent);
      const extractedRootData = convertedJsonObject.root || {};
      return JsonDiagramParser.processData(extractedRootData);
    }
    return null;
  };

  // Update diagram when nodes/connectors change
  useEffect(() => {
    refreshDiagramLayout(); // Refresh the diagram layout
  }, [diagramNodes, diagramConnectors]);

  // Refresh diagram layout and fit to page
  const refreshDiagramLayout = () => {
    if (diagramComponentRef.current) {
      diagramComponentRef.current.refresh();
      diagramComponentRef.current.fitToPage({canZoomIn:true});
    }
  };

  // =============================================================================
  // EDITOR EVENT HANDLERS
  // =============================================================================

  // Handle changes in the Monaco editor content
  const handleEditorContentChange = useCallback((newEditorValue: string | undefined) => {
    const updatedContent = newEditorValue || "";
    setEditorTextContent(updatedContent);
    parseAndProcessEditorContent(updatedContent, selectedEditorType);
    refreshDiagramLayout();
  }, [selectedEditorType]);

  // Handle switching between JSON and XML editor types with content conversion
  const handleEditorTypeSwitch = useCallback((newEditorType: EditorType) => {
    setSelectedEditorType(newEditorType);
    try {
      const convertedContent = convertEditorContent(editorTextContent, selectedEditorType, newEditorType);
      setEditorTextContent(convertedContent);
      parseAndProcessEditorContent(convertedContent, newEditorType);
      refreshDiagramLayout();
    } catch (error) {
      console.error("Conversion error:", error);
      setIsEditorContentValid(false);
    }
  }, [selectedEditorType, editorTextContent]);

  // Convert content between different editor types (JSON <-> XML)
  const convertEditorContent = (content: string, fromType: EditorType, toType: EditorType): string => {
    if (toType === "json" && fromType === "xml") {
      const convertedJsonObject = xmlToJsonParser.parse(content);
      return JSON.stringify(convertedJsonObject, null, 2);
    } else if (toType === "xml" && fromType === "json") {
      const parsedJsonData = JSON.parse(content);
      const xmlBuilder = new XMLBuilder({
        format: true,
        indentBy: "  ",
        suppressEmptyNode: true,
      });
      return xmlBuilder.build(parsedJsonData);
    }
    return content;
  };

  // =============================================================================
  // FILE OPERATIONS
  // =============================================================================

  // Handle file import and export operations
  const handleFileOperations = useCallback((fileAction: string) => {
    if (fileAction === "import") {
      importFile();
    } else if (fileAction === "export") {
      exportFile();
    }
  }, [selectedEditorType, editorTextContent]);

  // Import file functionality with file reader
  const importFile = () => {
    const fileInputElement = document.createElement("input");
    fileInputElement.type = "file";
    fileInputElement.accept = selectedEditorType === "json" ? ".json" : ".xml";
    fileInputElement.onchange = (event) => {
      const selectedFile = (event.target as HTMLInputElement).files?.[0];
      if (selectedFile) {
        const fileReader = new FileReader();
        fileReader.onload = (loadEvent) => {
          const fileTextContent = loadEvent.target?.result as string;
          setEditorTextContent(fileTextContent);
          parseAndProcessEditorContent(fileTextContent, selectedEditorType);
          refreshDiagramLayout();
        };
        fileReader.readAsText(selectedFile);
      }
    };
    fileInputElement.click();
  };

  // Export file functionality with blob download
  const exportFile = () => {
    const contentBlob = new Blob([editorTextContent], { type: "text/plain" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(contentBlob);
    downloadLink.download = `Diagram.${selectedEditorType}`;
    downloadLink.click();
  };

  // =============================================================================
  // VIEW OPTIONS MANAGEMENT
  // =============================================================================

  // Handle toggling of various view options (grid, count, expand/collapse icons)
  const handleViewOptionsToggle = useCallback((viewOptionId: string) => {
    if (!diagramComponentRef.current) return;

    switch (viewOptionId) {
      case "view-grid":
        setShouldShowGridLines(!shouldShowGridLines);
        break;
      case "view-count":
        setShouldShowChildItemsCount(!shouldShowChildItemsCount);
        setTimeout(() => { refreshDiagramLayout(); }); // Delay to allow state update
        break;
      case "expand-collapse":
        setShouldDisplayExpandCollapseIcons(!shouldDisplayExpandCollapseIcons);
        setTimeout(() => { refreshDiagramLayout(); }); // Delay to allow state update
        break;
    }
  }, [shouldShowGridLines, shouldShowChildItemsCount, shouldDisplayExpandCollapseIcons]);

  // =============================================================================
  // THEME MANAGEMENT
  // =============================================================================

  // Handle theme changes and update document styling
  const handleThemeChange = useCallback((newThemeType: ThemeType) => {
    if (theme === newThemeType) return;
    
    setTheme(newThemeType);
    // Update document body classes for theme
    document.body.classList.toggle("dark-theme", newThemeType === "dark");
    
    // Update theme stylesheet link for Syncfusion components
    const themeStylesheetLink = document.getElementById("theme-link") as HTMLLinkElement;
    if (themeStylesheetLink) {
      let stylesheetHref = themeStylesheetLink.href;
      if (newThemeType === "dark") {
        stylesheetHref = stylesheetHref.replace(/tailwind(\.css)/g, "tailwind-dark$1");
      } else {
        stylesheetHref = stylesheetHref.replace(/tailwind-dark(\.css)/g, "tailwind$1");
      }
      themeStylesheetLink.href = stylesheetHref;
    }
    
    // Reset nodes and connectors to apply new theme colors
    if (diagramComponentRef.current) {
      setDiagramNodes([...diagramComponentRef.current.nodes]);
      setDiagramConnectors([...diagramComponentRef.current.connectors]);
    }
    clearToolbarSearchInput();
  }, [setTheme]);

  // =============================================================================
  // DIAGRAM TOOLBAR ACTIONS
  // =============================================================================

  // Handle various diagram toolbar actions (zoom, reset, fit to page)
  const handleDiagramToolbarActions = useCallback((toolbarAction: string) => {
    if (!diagramComponentRef.current) return;
    
    const zoomStepFactor = DIAGRAM_CONSTANTS.ZOOM_STEP_FACTOR;
    const actions = {
      reset: () => diagramComponentRef.current!.reset(),
      fitToPage: () => diagramComponentRef.current!.fitToPage({canZoomIn:true}),
      zoomIn: () => diagramComponentRef.current!.zoomTo({ type: "ZoomIn", zoomFactor: zoomStepFactor }),
      zoomOut: () => diagramComponentRef.current!.zoomTo({ type: "ZoomOut", zoomFactor: zoomStepFactor })
    };
    
    const action = actions[toolbarAction as keyof typeof actions];
    if (action) action();
  }, []);

  // =============================================================================
  // SEARCH FUNCTIONALITY
  // =============================================================================

  // Handle diagram search functionality with highlighting and navigation
  const handleDiagramSearch = useCallback((searchQuery: string) => {
    if (!diagramComponentRef.current) return;
    
    resetSearchHighlights();
    
    if (!searchQuery) {
      updateSearchCounter(0, 0);
      return;
    }
    
    const foundMatches = findSearchMatches(searchQuery);
    setSearchResultMatches(foundMatches);
    setCurrentSearchMatchIndex(0);
    
    if (foundMatches.length > 0) {
      focusOnSearchMatch(foundMatches, 0);
      updateSearchCounter(1, foundMatches.length);
    } else {
      updateSearchCounter(0, 0);
    }
  }, []);

  // Reset all search highlights and restore original node styling
  const resetSearchHighlights = () => {
    if (!diagramComponentRef.current) return;
    
    diagramComponentRef.current.reset();
    diagramComponentRef.current.nodes.forEach((diagramNode: any) => {
      const nodeElement = document.getElementById(diagramNode.id + "_content");
      if (nodeElement) {
        const currentThemeSettings = currentThemeSettingsRef.current;
        nodeElement.style.fill = currentThemeSettings.nodeFillColor;
        nodeElement.style.stroke = currentThemeSettings.nodeStrokeColor;
        nodeElement.style.strokeWidth = "1.5";
      }
    });
  };

  // Find all nodes that match the search query
  const findSearchMatches = (searchQuery: string): string[] => {
    const foundMatches: string[] = [];
    if (diagramComponentRef.current) {
      diagramComponentRef.current.nodes.forEach((diagramNode: any) => {
        const nodeDataString = ("" + (diagramNode.data?.actualdata || "")).toLowerCase();
        if (nodeDataString.includes(searchQuery.toLowerCase())) {
          foundMatches.push(diagramNode.id);
        }
      });
    }
    return foundMatches;
  };

  // Focus on search match and apply appropriate highlighting
  const focusOnSearchMatch = (matchedNodeIds: string[], targetMatchIndex: number) => {
    if (!diagramComponentRef.current || matchedNodeIds.length === 0) return;
    const currentThemeSettings = currentThemeSettingsRef.current;
    
    matchedNodeIds.forEach((nodeId, matchIndex) => {
      const nodeContentElement = document.getElementById(nodeId + "_content");
      if (nodeContentElement) {
        if (matchIndex === targetMatchIndex) {
          // Apply focused highlight styling to current match
          nodeContentElement.style.fill = currentThemeSettings.highlightFocusColor;
          nodeContentElement.style.stroke = currentThemeSettings.highlightStrokeColor;
          nodeContentElement.style.strokeWidth = "2";
          // Center the focused node in view
          diagramComponentRef.current!.bringToCenter(
            (diagramComponentRef.current!.getObject(nodeId) as any).wrapper.bounds
          );
        } else {
          // Apply regular highlight styling to other matches
          nodeContentElement.style.fill = currentThemeSettings.highlightFillColor;
          nodeContentElement.style.stroke = currentThemeSettings.highlightStrokeColor;
          nodeContentElement.style.strokeWidth = "1.5";
        }
      }
    });
  };

  // Update search result counter in the toolbar
  const updateSearchCounter = (current: number, total: number) => {
    if ((window as any).updateSearchCounter) {
      (window as any).updateSearchCounter(current, total);
    }
  };

  // Handle Enter key navigation through search results
  useEffect(() => {
    const handleEnterKeyNavigation = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Enter" && searchResultMatches.length > 0) {
        const nextMatchIndex = (currentSearchMatchIndex + 1) % searchResultMatches.length;
        setCurrentSearchMatchIndex(nextMatchIndex);
        focusOnSearchMatch(searchResultMatches, nextMatchIndex);
        updateSearchCounter(nextMatchIndex + 1, searchResultMatches.length);
      }
    };

    document.addEventListener("keydown", handleEnterKeyNavigation);
    return () => document.removeEventListener("keydown", handleEnterKeyNavigation);
  }, [searchResultMatches, currentSearchMatchIndex]);

  // =============================================================================
  // EXPORT DIALOG MANAGEMENT
  // =============================================================================

  // Open the export image dialog
  const handleExportImageDialogOpen = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  // Handle diagram export with specified filename and format
  const handleDiagramExport = useCallback((exportFileName: string, exportFormat: string) => {
    if (diagramComponentRef.current) {
      diagramComponentRef.current.exportDiagram({
        format: exportFormat as any,
        fileName: exportFileName,
      });
    }
  }, []);

  // =============================================================================
  // LAYOUT MANAGEMENT
  // =============================================================================

  // Handle diagram layout rotation through available orientations
  const handleDiagramLayoutRotation = useCallback(() => {
    if (!diagramComponentRef.current) return;
    
    const nextOrientationIndex = (currentLayoutOrientationIndex + 1) % LAYOUT_ORIENTATIONS.length;
    const newLayoutOrientation = LAYOUT_ORIENTATIONS[nextOrientationIndex];
    setCurrentLayoutOrientationIndex(nextOrientationIndex);
    
    diagramComponentRef.current.layout.orientation = newLayoutOrientation as any;
    
    // Update expand/collapse icon positions for new orientation
    diagramComponentRef.current.nodes.forEach((diagramNode: any) => {
      updateExpandCollapseIconPosition(diagramNode, newLayoutOrientation);
    });
    
    diagramComponentRef.current.dataBind();
    diagramComponentRef.current.fitToPage({canZoomIn:true});
  }, [currentLayoutOrientationIndex]);

  // =============================================================================
  // GRAPH COLLAPSE/EXPAND MANAGEMENT
  // =============================================================================

  // Handle toggling between collapsed and expanded state for entire graph
  const handleGraphCollapseToggle = useCallback(() => {
    if (!diagramComponentRef.current) return;

    const allDiagramNodes = diagramComponentRef.current.nodes;

    if (isEntireGraphCollapsed) {
      // Expand all nodes in the graph
      allDiagramNodes.forEach((diagramNode: NodeModel) => {
        if (diagramNode.isExpanded === false) {
          diagramNode.isExpanded = true;
        }
      });
    } else {
      // Collapse all root-level nodes in the graph
      const rootLevelNodes = allDiagramNodes.filter((diagramNode: any) => 
        !diagramNode.inEdges || diagramNode.inEdges.length === 0
      );
      
      rootLevelNodes.forEach((rootNode: NodeModel) => {
        if (!(rootNode as any).expandIcon || (rootNode as any).expandIcon.shape === "None") {
          // Collapse children of root node
          (rootNode as any).outEdges?.forEach((connectorId: string) => {
            const relatedConnector = diagramComponentRef.current!.connectors.find((connector: any) => 
              connector.id === connectorId
            );
            if (relatedConnector) {
              const targetNode = allDiagramNodes.find((node: NodeModel) => 
                node.id === relatedConnector.targetID
              );
              if (targetNode) {
                targetNode.isExpanded = false;
              }
            }
          });
        } else {
          rootNode.isExpanded = false;
        }
      });
    }

    setIsEntireGraphCollapsed(!isEntireGraphCollapsed);
    diagramComponentRef.current.dataBind();
    diagramComponentRef.current.doLayout();
  }, [isEntireGraphCollapsed]);

  // =============================================================================
  // NODE INTERACTION MANAGEMENT
  // =============================================================================

  // Handle node click events and show node details dialog
  const handleDiagramNodeClick = useCallback((clickEventArgs: any) => {
    if (clickEventArgs?.actualObject?.data) {
      const clickedNodeData = clickEventArgs.actualObject.data.actualdata;
      const clickedNodePath = clickEventArgs.actualObject.data.path;

      if (clickedNodeData && clickedNodePath) {
        setSelectedNodeDetailsData({
          content: clickedNodeData,
          path: clickedNodePath,
        });
        setIsNodeDetailsDialogOpen(true);
      }
    }
  }, []);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  // Calculate the width of text using canvas measurement
  const calculateTextWidth = (textContent: string, fontStyle: string): number => {
    const measurementCanvas = document.createElement("canvas");
    const canvasContext = measurementCanvas.getContext("2d");
    if (canvasContext) {
      canvasContext.font = fontStyle;
      return canvasContext.measureText(textContent).width;
    }
    return 0;
  };

  // Calculate optimal node dimensions based on content and display settings
  const calculateNodeDimensions = (
    nodeData: any, 
    fontSpecification: string = DIAGRAM_CONSTANTS.FONT_SPECIFICATION, 
    paddingSize: number, 
    lineHeight: number = DIAGRAM_CONSTANTS.TEXT_LINE_HEIGHT, 
    expandIconWidth: number = DIAGRAM_CONSTANTS.EXPAND_COLLAPSE_ICON_WIDTH
  ) => {
    let maximumTextWidth = 0;
    let totalLinesCount = 0;

    const isLeafNode = nodeData.additionalInfo?.isLeaf === true;
    const nodeAnnotations = nodeData.annotations || [];

    if (isLeafNode) {
      const keyAnnotations = nodeAnnotations.filter((annotation: any) => annotation.id?.startsWith("Key"));
      const valueAnnotations = nodeAnnotations.filter((annotation: any) => annotation.id?.startsWith("Value"));
      totalLinesCount = keyAnnotations.length;

      // Calculate width for each key-value pair line
      for (let lineIndex = 0; lineIndex < totalLinesCount; lineIndex++) {
        const keyText = keyAnnotations[lineIndex]?.content || "";
        const valueText = valueAnnotations[lineIndex]?.content || "";
        const combinedTextWidth = calculateTextWidth(keyText + "   " + valueText, fontSpecification);
        maximumTextWidth = Math.max(maximumTextWidth, combinedTextWidth);
      }
      
      if (keyAnnotations.length === 0 && valueAnnotations.length === 0) {
        maximumTextWidth = Math.max(maximumTextWidth, calculateTextWidth(nodeAnnotations[0]?.content || " ", fontSpecification));
      }
    } else if (nodeAnnotations.length === 2 && !isLeafNode) {
      const keyText = nodeAnnotations[0].content;
      const countText = nodeAnnotations[1].content;
      maximumTextWidth = calculateTextWidth(keyText + countText, fontSpecification);
      totalLinesCount = 1;
    }

    const calculatedWidth = Math.max(maximumTextWidth + paddingSize + (!isLeafNode ? expandIconWidth * 2 : 0), DIAGRAM_CONSTANTS.MIN_NODE_WIDTH);
    const calculatedHeight = Math.max(totalLinesCount * lineHeight + paddingSize * 2, DIAGRAM_CONSTANTS.MIN_NODE_HEIGHT);

    return { width: calculatedWidth, height: calculatedHeight, linesCount: totalLinesCount };
  };

  // Determine appropriate color for value text based on data type
  const determineValueTextColor = (rawValueText: string) => {
    if (!isNaN(parseFloat(rawValueText))) {
      return themeSettings.numericColor;
    } else if (rawValueText.toLowerCase() === "true" || rawValueText.toLowerCase() === "false") {
      return rawValueText.toLowerCase() === "true" ? themeSettings.booleanColor : "red";
    }
    return themeSettings.textValueColor;
  };

  // Format value for display with appropriate quotes for strings
  const formatValueForDisplay = (rawValueText: string): string => {
    const isStringValue = isNaN(Number(rawValueText)) && 
      rawValueText.toLowerCase() !== "true" && 
      rawValueText.toLowerCase() !== "false";
    
    if (!isStringValue) {
      return rawValueText.toLowerCase() === "true" || rawValueText.toLowerCase() === "false"
        ? rawValueText.toLowerCase()
        : rawValueText;
    }
    
    if (isStringValue && rawValueText.trim() !== "") {
      return rawValueText.startsWith('"') && rawValueText.endsWith('"') ? rawValueText : `"${rawValueText}"`;
    }
    
    return rawValueText;
  };

  // Update expand/collapse icon position based on layout orientation
  const updateExpandCollapseIconPosition = (nodeModel: any, layoutOrientation: string) => {
    if (nodeModel.expandIcon && nodeModel.collapseIcon) {
      if (layoutOrientation === "LeftToRight" || layoutOrientation === "RightToLeft") {
        nodeModel.expandIcon.offset = nodeModel.collapseIcon.offset = {
          x: 0.5,
          y: layoutOrientation === "RightToLeft" ? 0 : 1,
        };
      } else if (layoutOrientation === "TopToBottom" || layoutOrientation === "BottomToTop") {
        nodeModel.expandIcon.offset = nodeModel.collapseIcon.offset = {
          x: 1,
          y: 0.5,
        };
      }
    }
  };

  // =============================================================================
  // NODE CONFIGURATION METHODS
  // =============================================================================

  // Configure key annotation with proper styling and positioning
  const configureKeyAnnotation = (annotation: any, nodeModel: NodeModel, fontSpecification: string, padding: number, yOffset: number) => {
    annotation.style = {
      fontSize: 12,
      fontFamily: "Consolas",
      color: themeSettings.textKeyColor,
    };
    const keyTextWidth = calculateTextWidth(annotation.content, fontSpecification);
    const keyHorizontalOffset = keyTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH) + padding / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH);
    annotation.offset = { x: keyHorizontalOffset, y: yOffset };
  };

  // Configure value annotation with proper styling and positioning
  const configureValueAnnotation = (annotation: any, previousAnnotation: any, nodeModel: NodeModel, fontSpecification: string, padding: number, yOffset: number) => {
    annotation.style = {
      fontSize: 12,
      fontFamily: "Consolas",
      color: annotation.id?.startsWith("Value")
        ? determineValueTextColor(annotation.content)
        : themeSettings.textValueColor,
    };
    
    if (previousAnnotation) {
      const keyTextWidth = calculateTextWidth(previousAnnotation.content ?? "", fontSpecification);
      const valueTextWidth = calculateTextWidth(annotation.content, fontSpecification);
      const keyHorizontalOffset = keyTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH);
      const valueHorizontalOffset = keyHorizontalOffset * 2 + valueTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH) + (padding + 8) / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH);
      
      annotation.offset = { x: valueHorizontalOffset, y: yOffset };
      annotation.content = formatValueForDisplay(annotation.content);
    }
  };

  // Configure annotations for leaf nodes with key-value pairs
  const configureLeafNodeAnnotations = (nodeModel: NodeModel, fontSpecification: string, annotationsPadding: number) => {
    const nodeAnnotationsList = nodeModel.annotations || [];
    const keyAnnotations = nodeAnnotationsList.filter((annotation: any) => annotation.id?.startsWith("Key"));
    const textLinesCount = keyAnnotations.length;
    let verticalSpacing = textLinesCount > 0 ? 1.0 / (textLinesCount + 1) : 0.5;
    let currentLineNumber = 1;

    for (let annotationIndex = 0; annotationIndex < nodeAnnotationsList.length; annotationIndex++) {
      const currentAnnotation = nodeAnnotationsList[annotationIndex] as any;
      if (!currentAnnotation.id) continue;

      let verticalOffset = currentLineNumber * verticalSpacing;

      if (currentAnnotation.id.startsWith("Key")) {
        configureKeyAnnotation(currentAnnotation, nodeModel, fontSpecification, annotationsPadding, verticalOffset);
      } else {
        const previousAnnotation = nodeAnnotationsList[annotationIndex - 1];
        configureValueAnnotation(currentAnnotation, previousAnnotation, nodeModel, fontSpecification, annotationsPadding, verticalOffset);
        currentLineNumber++;
      }
    }
  };

  // Configure annotations for non-leaf nodes with key and count
  const configureNonLeafNodeAnnotations = (nodeModel: NodeModel, padding: number, expandIconWidth: number) => {
    const keyTextAnnotation = nodeModel.annotations![0] as any;
    const countTextAnnotation = nodeModel.annotations![1] as any;

    // Configure key annotation
    keyTextAnnotation.style = {
      fontSize: 12,
      fontFamily: "Consolas",
      color: themeSettings.textKeyColor,
    };
    keyTextAnnotation.offset = { x: shouldShowChildItemsCount ? 0 : 0.5, y: 0.5 };
    keyTextAnnotation.margin = {
      left: shouldShowChildItemsCount ? padding : shouldDisplayExpandCollapseIcons ? -padding : 0,
    };
    keyTextAnnotation.horizontalAlignment = shouldShowChildItemsCount ? "Left" : "Center";

    // Configure count annotation
    if (shouldShowChildItemsCount) {
      countTextAnnotation.visibility = true;
      countTextAnnotation.style = {
        fontSize: 12,
        fontFamily: "Consolas",
        color: themeSettings.textValueColor,
      };
      countTextAnnotation.offset = { x: 1, y: 0.5 };
      countTextAnnotation.horizontalAlignment = "Right";
      countTextAnnotation.margin = {
        right: padding + (shouldDisplayExpandCollapseIcons ? expandIconWidth : 0),
      };
    } else {
      countTextAnnotation.visibility = false;
    }
  };

  // Configure expand and collapse icons for non-leaf nodes
  const configureExpandCollapseIcons = (nodeModel: NodeModel, iconWidth: number, cornerRadius: number) => {
    const expandIconConfiguration = {
      shape: "Minus",
      width: iconWidth,
      height: nodeModel.height,
      cornerRadius: cornerRadius,
      margin: { right: iconWidth / 2 },
      fill: themeSettings.expandIconFillColor,
      borderColor: themeSettings.expandIconBorder,
      iconColor: themeSettings.expandIconColor,
    };
    
    const collapseIconConfiguration = {
      shape: "Plus",
      width: iconWidth,
      height: nodeModel.height,
      cornerRadius: cornerRadius,
      margin: { right: iconWidth / 2 },
      fill: themeSettings.expandIconFillColor,
      borderColor: themeSettings.expandIconBorder,
      iconColor: themeSettings.expandIconColor,
    };

    const currentDiagramOrientation = diagramComponentRef.current?.layout?.orientation || 
      LAYOUT_ORIENTATIONS[currentLayoutOrientationIndex];
    
    updateExpandCollapseIconPosition(nodeModel, currentDiagramOrientation);

    (nodeModel as any).expandIcon = expandIconConfiguration;
    (nodeModel as any).collapseIcon = collapseIconConfiguration;
  };

  // Configure individual node based on its type and properties
  const configureNode = (nodeModel: NodeModel, isLeafNode: boolean, isMainRootNode: boolean): NodeModel => {
    const fontSpecification = DIAGRAM_CONSTANTS.FONT_SPECIFICATION;
    const textLineHeight = DIAGRAM_CONSTANTS.TEXT_LINE_HEIGHT;
    const annotationsPadding = DIAGRAM_CONSTANTS.ANNOTATIONS_PADDING;
    const expandCollapseIconWidth = DIAGRAM_CONSTANTS.EXPAND_COLLAPSE_ICON_WIDTH;
    const nodeCornerRadius = DIAGRAM_CONSTANTS.NODE_CORNER_RADIUS;

    // Set constraints to disable certain interactions
    nodeModel.constraints = NodeConstraints.Default & 
      ~(NodeConstraints.Rotate | NodeConstraints.Select | NodeConstraints.Resize | 
        NodeConstraints.Delete | NodeConstraints.Drag);

    // Configure shape and style
    nodeModel.shape = {
      type: "Basic",
      shape: isMainRootNode ? "Ellipse" : "Rectangle",
      cornerRadius: nodeCornerRadius,
    };

    nodeModel.style = {
      fill: themeSettings.nodeFillColor,
      strokeColor: themeSettings.nodeStrokeColor,
      strokeWidth: 1.5,
    };

    // Set dimensions
    if (isMainRootNode) {
      nodeModel.width = DIAGRAM_CONSTANTS.MAIN_ROOT_SIZE;
      nodeModel.height = DIAGRAM_CONSTANTS.MAIN_ROOT_SIZE;
    } else {
      const { width, height } = calculateNodeDimensions(
        nodeModel, fontSpecification, annotationsPadding, textLineHeight, expandCollapseIconWidth
      );
      nodeModel.width = width;
      nodeModel.height = height;
    }

    // Configure annotations
    if (nodeModel.annotations && !isMainRootNode) {
      if (isLeafNode) {
        configureLeafNodeAnnotations(nodeModel, fontSpecification, annotationsPadding);
      } else if (nodeModel.annotations.length === 2) {
        configureNonLeafNodeAnnotations(nodeModel, annotationsPadding, expandCollapseIconWidth);
      }
    }

    // Configure expand/collapse icons
    if (!isLeafNode && !isMainRootNode && shouldDisplayExpandCollapseIcons) {
      configureExpandCollapseIcons(nodeModel, expandCollapseIconWidth, nodeCornerRadius);
    } else {
      (nodeModel as any).expandIcon = { shape: "None", visibility: false };
      (nodeModel as any).collapseIcon = { shape: "None", visibility: false };
    }

    return nodeModel;
  };

  // =============================================================================
  // DIAGRAM COMPONENT CONFIGURATION
  // =============================================================================

  // Get default node configuration for diagram component
  const getDefaultNodeConfiguration = (nodeModel: NodeModel): NodeModel => {
    const isLeafNode = (nodeModel as any).additionalInfo?.isLeaf === true;
    const isMainRootNode = nodeModel.id === "main-root";
    
    return configureNode(nodeModel, isLeafNode, isMainRootNode);
  };

  // Get default connector configuration for diagram component
  const getDefaultConnectorConfiguration = (connectorModel: ConnectorModel): ConnectorModel => {
    connectorModel.type = "Orthogonal";
    connectorModel.cornerRadius = 15;
    connectorModel.targetDecorator = { shape: "None" };
    connectorModel.style = {
      strokeColor: themeSettings.connectorStrokeColor,
      strokeWidth: 2,
    };
    connectorModel.constraints = ConnectorConstraints.Default & ConnectorConstraints.Select;

    return connectorModel;
  };

  // =============================================================================
  // RENDER COMPONENT
  // =============================================================================

  return (
    <div className="app-layout">
      {/* Navigation Bar */}
      <NavMenu
        currentEditorType={selectedEditorType}
        onEditorTypeChange={handleEditorTypeSwitch}
        onFileAction={handleFileOperations}
        onViewOptionToggle={handleViewOptionsToggle}
        onThemeChange={handleThemeChange}
      />

      {/* Main Content */}
      <div className="main-grid">
        {/* Left Panel - Editor */}
        <div className="left-panel">
          <div className="monaco-editor-container">
            <Editor
              height="100%"
              language={selectedEditorType}
              value={editorTextContent}
              onChange={handleEditorContentChange}
              theme={theme === "dark" ? "vs-dark" : "vs"}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                scrollbar: {
                  verticalScrollbarSize: 5,
                  horizontalScrollbarSize: 5,
                },
                stickyScroll: { enabled: false },
                placeholder: "Start Typing..."
              }}
            />
          </div>
        </div>

        {/* Resizer */}
        <Resizer />

        {/* Right Panel - Diagram */}
        <div className="right-panel scroll-hide">
          <HamburgerMenu
            onExportImage={handleExportImageDialogOpen}
            onRotateLayout={handleDiagramLayoutRotation}
            onCollapseGraph={handleGraphCollapseToggle}
            isGraphCollapsed={isEntireGraphCollapsed}
          />

          <DiagramComponent
            ref={diagramComponentRef}
            width="100%"
            height="100%"
            backgroundColor={themeSettings.backgroundColor}
            nodes={diagramNodes}
            connectors={diagramConnectors}
            scrollSettings={{ scrollLimit: "Infinity" }}
            layout={{
              type: "HierarchicalTree",
              enableAnimation: false,
              connectionPointOrigin: ConnectionPointOrigin.DifferentPoint,
              orientation: "LeftToRight",
              horizontalSpacing: 30,
              verticalSpacing: 100,
            }}
            snapSettings={{
              constraints: shouldShowGridLines
                ? SnapConstraints.ShowLines
                : SnapConstraints.None,
              horizontalGridlines: {
                lineColor: themeSettings.gridlinesColor,
              },
              verticalGridlines: {
                lineColor: themeSettings.gridlinesColor,
              },
            }}
            tool={DiagramTools.SingleSelect | DiagramTools.ZoomPan}
            click={handleDiagramNodeClick}
            getNodeDefaults={getDefaultNodeConfiguration}
            getConnectorDefaults={getDefaultConnectorConfiguration}
          >
            <Inject
              services={[
                DataBinding,
                HierarchicalTree,
                PrintAndExport,
                LineDistribution,
              ]}
            />
          </DiagramComponent>

          <Toolbar
            onToolClick={handleDiagramToolbarActions}
            onSearch={handleDiagramSearch}
          />

          <Spinner isVisible={isLoadingSpinnerVisible} />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          <span className="status-message">
            <div style={{ display: isEditorContentValid ? "flex" : "none" }}>
              <span className="e-icons e-check"></span>
              <span>Valid {selectedEditorType.toUpperCase()}</span>
            </div>
            <div
              className="invalid-json"
              style={{ display: isEditorContentValid ? "none" : "flex" }}
            >
              <span className="e-icons e-close"></span>
              <span>Invalid {selectedEditorType.toUpperCase()}</span>
            </div>
          </span>
          <span className="bottom-right">Nodes: {totalNodeCount}</span>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        isVisible={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleDiagramExport}
      />

      <NodeDetailsDialog
        isVisible={isNodeDetailsDialogOpen}
        nodeContent={selectedNodeDetailsData.content}
        nodePath={selectedNodeDetailsData.path}
        onClose={() => setIsNodeDetailsDialogOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;