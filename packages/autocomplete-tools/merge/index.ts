/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  Project,
  ts,
  SourceFile,
  Node,
  Symbol as TSMSymbol,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
} from "ts-morph";
import prettier from "prettier";
import { defaultPreset, presets } from "./presets";
import type { PresetName, Preset } from "./presets";

const project = new Project();

function parseFile(filePath: string, input: string): SourceFile {
  return project.createSourceFile(filePath, input, { overwrite: true });
}

function setupFile(
  path: string,
  file: string,
  getDefaultExport?: true
): [sourceFile: SourceFile, defaultExport: TSMSymbol];
function setupFile(path: string, file: string, getDefaultExport: false): [sourceFile: SourceFile];
function setupFile(path: string, file: string, getDefaultExport = true) {
  const sourceFile = parseFile(path, file);
  if (getDefaultExport) {
    const sourceFileDefaultExport = sourceFile.getDefaultExportSymbol();
    if (!sourceFileDefaultExport)
      throw new Error(
        `A Fig spec file should default as default a completion spec object\nRaised at: ${path}`
      );
    return [sourceFile, sourceFileDefaultExport];
  }
  return [sourceFile];
}

function isSpecObject(statement: Node<ts.Statement>, name: string): boolean {
  if (Node.isVariableStatement(statement)) {
    const declarations = statement.getDeclarationList().getDeclarations();
    return declarations.some((declaration) => declaration.getName() === name);
  }
  return false;
}

/**
 * @returns {ts.Node[]} the node path of the specified node, it should be read from the end to the start
 */
// TODO: find a way to avoid recalculating this every time. It may be expensive for complex specs
function generateNodePath(node: ts.PropertyAssignment | ts.ShorthandPropertyAssignment): ts.Node[] {
  let currentNode: ts.Node = node;
  const path: ts.Node[] = [];
  do {
    path.push(currentNode);
    currentNode = currentNode.parent;
  } while (!ts.isVariableDeclaration(currentNode));
  return path;
}

function resolveArrayLiteral(path: ts.Node[], arrayNode: ArrayLiteralExpression): Node | undefined {
  const newPath = path.slice(0, -1);
  const currentPathItem = newPath[newPath.length - 1];
  const elements = arrayNode.getElements();

  // The assertion below is an identity, we just use it for type casting
  if (ts.isObjectLiteralExpression(currentPathItem)) {
    // Check if the object has a name property and get its value
    const nameToFind = currentPathItem.properties.filter(
      (prop): prop is ts.PropertyAssignment =>
        ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === "name"
    )[0]?.initializer;

    if (nameToFind) {
      for (const element of elements) {
        if (Node.isObjectLiteralExpression(element)) {
          const nameProp = element.getProperty("name");
          if (nameProp && Node.isPropertyAssignment(nameProp)) {
            const initializer = nameProp.getInitializer()!;
            if (initializer.getText() === nameToFind.getText()) {
              return resolve(newPath, element);
            }
          }
        }
      }
    } else {
      // check which is the index of currentPathItem in the parent ArrayExpression
      const foundIndex = (currentPathItem.parent as ts.ArrayLiteralExpression).elements.findIndex(
        (arrayElement) => arrayElement === currentPathItem
      );
      const element = elements[foundIndex];
      if (element && Node.isObjectLiteralExpression(element)) {
        return resolve(newPath, element);
      }
    }
  }
  return undefined;
}

function resolveObjectLiteral(
  path: ts.Node[],
  objectNode: ObjectLiteralExpression
): Node | undefined {
  const newPath = path.slice(0, -1);
  const currentPathItem = newPath[newPath.length - 1];
  // expect child item of an ObjectLiteral to be a PropertyAssignment
  if (!(ts.isPropertyAssignment(currentPathItem) && ts.isIdentifier(currentPathItem.name))) {
    return undefined;
  }
  const propNameToFind = currentPathItem.name.text;
  const props = objectNode.getProperties();
  for (const prop of props) {
    if (Node.isPropertyAssignment(prop) && prop.getName() === propNameToFind) {
      // if there is a matching prop and this is the last one item of the path return the prop.
      return resolve(newPath.slice(0, -1), prop.getInitializer()!);
    }
  }
  if (newPath.length === 1) {
    // if the last property of the path is only in the old spec (still needs to be added to the new one)
    return objectNode;
  }
  return undefined;
}

// The first item of a path is always a PropertyAssignment (the first is effectively the last item, the one we are looking for)
function resolve(path: ts.Node[], baseNode: Node): Node | undefined {
  if (!path.length) return baseNode;

  const currentItem = path[path.length - 1];
  if (ts.isObjectLiteralExpression(currentItem) && Node.isObjectLiteralExpression(baseNode)) {
    return resolveObjectLiteral(path, baseNode);
  }
  if (ts.isArrayLiteralExpression(currentItem) && Node.isArrayLiteralExpression(baseNode)) {
    return resolveArrayLiteral(path, baseNode);
  }
  return undefined;
}

function resolveAndUpdateNodePath(
  path: ts.Node[],
  newSpec: SourceFile,
  nodeToAdd: { name: string; initializer: string }
): boolean {
  const statement = newSpec.getFirstDescendantByKind(ts.SyntaxKind.VariableDeclaration);
  if (!statement)
    throw new Error("The new spec should contain one exported completion spec object");
  const statementInitializer = statement.getInitializer();
  if (statementInitializer && Node.isObjectLiteralExpression(statementInitializer)) {
    const out = resolve(path, statementInitializer);
    if (out && Node.isObjectLiteralExpression(out)) {
      out.addPropertyAssignment(nodeToAdd);
      return true;
    }
    // if Node.isPropertyAssignement(out) -> the property already exist at the specified path. We keep the updated one.
    return false;
  }
  throw new Error(
    "The new spec file should contain exactly one variable declaration containing the spec object."
  );
}

function getFirstParentProperty(nodePath: ts.Node[]): ts.PropertyAssignment | undefined {
  const i = nodePath.length - 2; // exclude the last element as we know it is a property
  while (i >= 0) {
    const node = nodePath[i];
    if (ts.isPropertyAssignment(node)) {
      return node;
    }
  }
  return undefined;
}

// `statement` can only be one of the top-level statements
function traverseSpecs(
  statement: Node<ts.Statement>,
  destination: SourceFile,
  updatableProps: Preset
) {
  statement.transform((traversal) => {
    const node = traversal.visitChildren();
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      let observedSet: Set<string> | null = null;
      const nodePath = generateNodePath(node);
      // look for the first property assignment in the path. If no one is found, then assume we are handling a top level command prop
      if (node.name.escapedText === "exclusiveOn") {
        debugger;
      }
      const parentProperty = getFirstParentProperty(nodePath);
      if (!parentProperty) {
        observedSet = updatableProps.commandProps;
      } else if (ts.isIdentifier(parentProperty.name)) {
        const parentPropText = parentProperty.name.text;
        switch (parentPropText) {
          case "subcommands":
            observedSet = updatableProps.commandProps;
            break;
          case "options":
            observedSet = updatableProps.optionProps;
            break;
          case "args":
            observedSet = updatableProps.argProps;
            break;
          default:
        }
      }
      if (observedSet && !observedSet.has(node.name.text)) {
        resolveAndUpdateNodePath(nodePath, destination, {
          name: node.name.text,
          initializer: node.initializer.getText(),
        });
      }
    }
    return node;
  });
}

export interface MergeOptions {
  ignore?: {
    commandProps?: string[];
    optionProps?: string[];
    argProps?: string[];
    commonProps?: string[];
  };
  preset?: PresetName;
}

function getPreset({ preset, ignore = {} }: MergeOptions): Preset {
  // Props updated by the eventual CLI tool integration (preset)
  let updatableProps = preset ? presets[preset] : undefined;
  // If not preset was specified we default to the defaultPreset excluding all props the user ignored
  if (!updatableProps) {
    const { commandProps = [], optionProps = [], argProps = [], commonProps = [] } = ignore;
    for (const commandProp of commandProps) {
      defaultPreset.commandProps.add(commandProp);
    }
    for (const optionProp of optionProps) {
      defaultPreset.optionProps.add(optionProp);
    }
    for (const argProp of argProps) {
      defaultPreset.argProps.add(argProp);
    }
    for (const commonProp of commonProps) {
      defaultPreset.commandProps.add(commonProp);
      defaultPreset.optionProps.add(commonProp);
      defaultPreset.argProps.add(commonProp);
    }
    updatableProps = defaultPreset;
  }
  return updatableProps;
}

export default function merge(
  oldFileContent: string,
  newFileContent: string,
  options: MergeOptions
): string {
  const updatableProps = getPreset(options);

  const [oldSourceFile, oldSourceFileDefaultExport] = setupFile("oldfile.ts", oldFileContent);
  const [newSourceFile] = setupFile("newfile.ts", newFileContent);
  /// MARK: Work on old source file by extracting top level statements
  let specNodeName: string;
  // It should contain exactly one declaration since it is a default export
  const exportDeclaration = oldSourceFileDefaultExport.getDeclarations()[0];
  if (!(exportDeclaration && Node.isExportAssignment(exportDeclaration))) {
    throw new Error();
  }
  const exportDeclarationExpression = exportDeclaration.getExpression();
  if (Node.isIdentifier(exportDeclarationExpression)) {
    specNodeName = exportDeclarationExpression.getText();
  } else if (Node.isObjectLiteralExpression(exportDeclarationExpression)) {
    throw new Error(
      "You should not directly export the spec object, but you need to assign it to a variable before."
    );
  } else {
    throw new Error("Default export should be an Identifier.");
  }

  const diffTopLevelNodes: [start: string, middle: string, end: string] = ["", "", ""];
  const statements = oldSourceFile.getStatements();
  let state = 0;
  for (const statement of statements) {
    if (isSpecObject(statement, specNodeName)) {
      traverseSpecs(statement, newSourceFile, updatableProps);
      state += 1;
    } else if (statement === exportDeclaration) {
      state += 1;
    } else {
      diffTopLevelNodes[state] += statement.print();
    }
  }

  /// MARK: Save top level statements of the old file to the new source file
  newSourceFile.insertStatements(2, diffTopLevelNodes[2]);
  newSourceFile.insertStatements(1, diffTopLevelNodes[1]);
  newSourceFile.insertStatements(0, diffTopLevelNodes[0]);

  return prettier.format(ts.createPrinter().printFile(newSourceFile.compilerNode), {
    parser: "typescript",
    semi: false,
    singleQuote: true,
  });
}
