// types.d.ts

export type NodeType = "Variable" | "Definition" | "Action" | "Table" | "HTML";

export interface BaseNodeData {
  label: string;
}

export interface VariableNodeData extends BaseNodeData {
  value: string;
}

export interface DefinitionNodeData extends BaseNodeData {
  definition: string;
}

export interface ActionNodeData extends BaseNodeData {
  action: string;
}

export interface Column {
  name: string;
  type: "text" | "number" | "boolean"; // Extend if needed
}

export interface TableNodeData extends BaseNodeData {
  columns: Column[];
  rows: string[][]; // Assuming rows contain string values
}

export interface HTMLNodeData extends BaseNodeData {
  content: string;
}

export type NodeData =
  | VariableNodeData
  | DefinitionNodeData
  | ActionNodeData
  | TableNodeData
  | HTMLNodeData;
