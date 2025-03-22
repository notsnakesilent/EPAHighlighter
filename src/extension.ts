import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let connectionDecorationType: vscode.TextEditorDecorationType | undefined;
let siStack: { line: number; indent: number; text: string }[] = [];
let desdeStack: { line: number; indent: number; text: string }[] = [];
let mientrasStack: { line: number; indent: number; text: string }[] = [];
let segunStack: { line: number; indent: number; text: string }[] = [];
let diagnosticCollection: vscode.DiagnosticCollection;
let lebabOutputChannel: vscode.OutputChannel | undefined;
const subAlgoritmos: { [key: string]: number } = {};
const subAlgoritmosParams: { [key: string]: { E: string[]; S: string[] } } = {};
const functionCallRegex = /(?:\d+\s*:)?\s*([a-zA-Z_]\w*)\s*\(/g;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {


  const extension = vscode.extensions.getExtension('BrianWalker.EPAHighlighter');
  if (!extension) {
      return;
  }
  
  const currentVersion = extension.packageJSON.version;
  
  const previousVersion = context.globalState.get<string>('installedVersion');
  
  if (!previousVersion) {
      await context.globalState.update('installedVersion', currentVersion);
      const changelogShown = context.globalState.get<boolean>('changelogShown');

      if (!changelogShown) {
          showChangelog(currentVersion, undefined);
          await context.globalState.update('changelogShown', true);
      }
  } 

  else if (previousVersion !== currentVersion) {
      await context.globalState.update('installedVersion', currentVersion);

      showChangelog(currentVersion, previousVersion);
  }
  
  const config = vscode.workspace.getConfiguration("epaHighlighter");
  const version = config.get("version");

  let activateDisposable = vscode.commands.registerCommand(
    "extension.activate",
    function () {
      vscode.window.showInformationMessage(
        "EPAHighlighter Extension is now active!"
      );
    }
  );

  let versionOneDisposable = vscode.commands.registerCommand(
    "extension.version_one",
    async () => {
      // EPA
      try {
        const config = vscode.workspace.getConfiguration("epaHighlighter");
        await config.update("version", 1, true);
        await updateActiveSnippets(1);
        createStatusBarItem();
        vscode.window.showInformationMessage(
          "Cambiado a Pseudocodigo Version 1 (EPA)"
        );
      } catch (error) {
        console.error("Error al cambiar a Version 1:", error);
        vscode.window.showErrorMessage("Error al cambiar a Version 1");
      }
    }
  );

  let versionTwoDisposable = vscode.commands.registerCommand(
    "extension.version_two",
    async () => {
      // AyP I
      try {
        const config = vscode.workspace.getConfiguration("epaHighlighter");
        await config.update("version", 2, true);
        await updateActiveSnippets(2);
        createStatusBarItem();
        vscode.window.showInformationMessage(
          "Cambiado a Pseudocodigo Version 2 (AyP)"
        ); 
      } catch (error) {
        console.error("Error al cambiar a Version 2:", error);
        vscode.window.showErrorMessage("Error al cambiar a Version 2");
      }
    }
  );

  let versionThreeDisposable = vscode.commands.registerCommand(
    "extension.version_three",
    async () => {
    // AyP II
      try {
        const config = vscode.workspace.getConfiguration("epaHighlighter");
        await config.update("version", 3, true);
        await updateActiveSnippets(3);
        createStatusBarItem();
        vscode.window.showInformationMessage(
          "Cambiado a Pseudocodigo Version 3 (AyP II)"
        );

      } catch (error) {
        console.error("Error al cambiar a Version 3:", error);
        vscode.window.showErrorMessage("Error al cambiar a Version 3");
      }
    }
  );

  let selectVersion = vscode.commands.registerCommand('extension.showVersionOptions', () => {
    vscode.window.showQuickPick(['Version 1 [EPA]', 'Version 2 [AyP I]', 'Version 3 [AyP II]'], {
      placeHolder: 'Selecciona el modo de Pseudocódigo'
    }).then(selection => {
      if (selection === 'Version 1 [EPA]') {
        vscode.commands.executeCommand('extension.version_one');
      } else if (selection === 'Version 2 [AyP I]') {
        vscode.commands.executeCommand('extension.version_two');
      } else if (selection === 'Version 3 [AyP II]') {
        vscode.commands.executeCommand('extension.version_three');
      }
    });
  });

  
  createStatusBarItem();

  context.subscriptions.push(activateDisposable);
  context.subscriptions.push(versionOneDisposable);
  context.subscriptions.push(versionTwoDisposable);
  context.subscriptions.push(versionThreeDisposable);
  context.subscriptions.push(selectVersion);

  function createStatusBarItem() {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    const config = vscode.workspace.getConfiguration("epaHighlighter");
    const version = config.get("version") || 1;
    const versionNames: {[key in 1 | 2 | 3]: string} = {
        1: "EPA",
        2: "AyP",
        3: "AyP II"
      };
      
    const displayName = versionNames[version as 1 | 2 | 3] || "EPA";
    statusBarItem.text = `$(symbol-keyword) PseudoCodigo: ${displayName}`;
    statusBarItem.tooltip = "Versión actual de Pseudocódigo";
    statusBarItem.command = "extension.showVersionOptions";

    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
  }

  if (!lebabOutputChannel) {
    lebabOutputChannel = vscode.window.createOutputChannel("EPAHighlighter");
  }

  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("myExtension");

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    updateDecoration(editor);
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateDecoration(editor);
      }
    },
    null,
    context.subscriptions
  );
}
function getExtensionPath(): string {
  const extension = vscode.extensions.getExtension('BrianWalker.EPAHighlighter');
  if (!extension) {
      throw new Error('Extension not found');
  }
  return extension.extensionPath;
}

async function showChangelog(currentVersion: string, previousVersion: string | undefined) {
  const title = previousVersion 
      ? `EPA Highlighter actualizado a v${currentVersion}` 
      : `Bienvenido a EPA Highlighter v${currentVersion}`;
  
  const panel = vscode.window.createWebviewPanel(
      'epaChangelog',
      title,
      vscode.ViewColumn.One,
      {
          enableScripts: true,
          enableCommandUris: true,
          localResourceRoots: [
              vscode.Uri.file(path.join(getExtensionPath(), 'assets'))
          ]
      }
  );
  panel.webview.html = await getChangelogHtmlFromFile(currentVersion, previousVersion);
}

async function getChangelogHtmlFromFile(currentVersion: string, previousVersion: string | undefined): Promise<string> {
  const extensionPath = getExtensionPath();
  const htmlPath = path.join(extensionPath, 'assets', 'changelog.html');
  
  try {
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');

      htmlContent = htmlContent
          .replace(/\${currentVersion}/g, currentVersion)
          .replace(/\${previousVersion}/g, previousVersion || 'Nueva instalación')
          .replace(/\${welcomeMessage}/g, previousVersion ? 'Novedades en EPA Highlighter' : 'Bienvenido a EPA Highlighter');
      
      return htmlContent;
  } catch (error) {
      console.error('Error al leer el archivo de changelog:', error);
      return `<!DOCTYPE html>
          <html>
          <body>
              <h1>EPA Highlighter v${currentVersion}</h1>
              <p>No se pudo cargar el changelog completo.</p>
          </body>
          </html>`;
  }
}

async function updateActiveSnippets(version: number): Promise<void> {
  try {
    const extensionPath = vscode.extensions.getExtension(
      "BrianWalker.EPAHighlighter"
    )?.extensionPath;
    if (!extensionPath) {
      throw new Error("No se pudo encontrar la ruta de la extensión");
    }

    const sourceFile = path.join(
      extensionPath,
      "assets",
      "snippets",
      `version${version}.json`
    );
    const targetFile = path.join(
      extensionPath,
      "assets",
      "snippets",
      "active-snippets.json"
    );

    const snippetsContent = fs.readFileSync(sourceFile, "utf8");

    fs.writeFileSync(targetFile, snippetsContent);

    console.log(`Snippets actualizados a versión ${version}`);

const answer = await vscode.window.showInformationMessage(
    'Se van a guardar todos los archivos y recargar VS Code. El historial de deshacer se perderá. ¿Deseas continuar?',
    'Sí', 'No'
);

if (answer === 'Sí') {
    await vscode.workspace.saveAll();
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
} else {
    vscode.window.showInformationMessage('Operación cancelada');
}

  } catch (error) {
    console.error("Error al actualizar snippets:", error);
    throw error;
  }
}

function updateDecoration(editor: vscode.TextEditor) {
  const document = editor.document;
  const lines: vscode.DecorationOptions[] = [];
  siStack = [];
  desdeStack = [];
  mientrasStack = [];
  segunStack = [];

  decorateLines(document, 0, lines);

  if (connectionDecorationType) {
    connectionDecorationType.dispose();
  }

  connectionDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "0px",
    borderStyle: "solid",
    overviewRulerColor: "black",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });

  editor.setDecorations(connectionDecorationType, lines);
}

function decorateLines(
  document: vscode.TextDocument,
  startLine: number,
  lines: vscode.DecorationOptions[]
) {
  let lineIndex = startLine;
  let diagnostics: vscode.Diagnostic[] = [];

  while (lineIndex < document.lineCount) {
    const line = document.lineAt(lineIndex);
    const text = line.text.trim().toLowerCase();
    const range = (start: number, end: number) =>
      new vscode.Range(lineIndex, start, lineIndex, end);

    if (text.startsWith("fin si") || text.startsWith("finsi")) {
      const parentSi = siStack.pop();
      if (parentSi) {
        lines.push({
          range: range(0, line.text.length),
          hoverMessage: `${parentSi.text} (Línea ${parentSi.line + 1})`,
        });
      }
    } else if (text.startsWith("si ")) {
      siStack.push({
        line: lineIndex,
        indent: line.firstNonWhitespaceCharacterIndex,
        text,
      });
    }

    if (text.startsWith("fin desde") || text.startsWith("findesde")) {
      const parentDesde = desdeStack.pop();
      if (parentDesde) {
        lines.push({
          range: range(0, line.text.length),
          hoverMessage: `${parentDesde.text} (Línea ${parentDesde.line + 1})`,
        });
      }
    } else if (text.startsWith("desde ")) {
      desdeStack.push({
        line: lineIndex,
        indent: line.firstNonWhitespaceCharacterIndex,
        text,
      });
    }

    if (text.startsWith("fin mientras") || text.startsWith("finmientras")) {
      const parentMientras = mientrasStack.pop();
      if (parentMientras) {
        lines.push({
          range: range(0, line.text.length),
          hoverMessage: `${parentMientras.text} (Línea ${
            parentMientras.line + 1
          })`,
        });
      }
    } else if (text.startsWith("mientras ")) {
      mientrasStack.push({
        line: lineIndex,
        indent: line.firstNonWhitespaceCharacterIndex,
        text,
      });
    }

    if (text.startsWith("fin segun") || text.startsWith("finsegun")) {
      const parentSegun = segunStack.pop();
      if (parentSegun) {
        lines.push({
          range: range(0, line.text.length),
          hoverMessage: `${parentSegun.text} (Línea ${parentSegun.line + 1})`,
        });
      }
    } else if (text.startsWith("segun ")) {
      segunStack.push({
        line: lineIndex,
        indent: line.firstNonWhitespaceCharacterIndex,
        text,
      });
    }

    if (text.startsWith("subalgoritmo ")) {
      const subAlgoritmoNameMatch = text.match(/subalgoritmo\s+(\w+)/i);
      if (subAlgoritmoNameMatch && subAlgoritmoNameMatch[1]) {
        subAlgoritmos[subAlgoritmoNameMatch[1]] = lineIndex;
      }
    } else {
      let match;
      while ((match = functionCallRegex.exec(text)) !== null) {
        const functionName = match[1];
        const declarationLine = subAlgoritmos[functionName];
        if (declarationLine !== undefined) {
          lines.push({
            range: range(match.index, match.index + match[0].length),
            hoverMessage: `Declarado en la línea ${declarationLine + 1}.`,
          });
        }
      }
    }

    if (text.includes("algoritmo")) {
      const parts = text.split(" ");
      const index = parts.findIndex((part) => part === "algoritmo");
      if (
        index !== -1 &&
        (parts.length === index + 1 || parts[index + 1].trim() === "")
      ) {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: El algoritmo no tiene nombre",
            vscode.DiagnosticSeverity.Error
          )
        );
      } else if (index !== -1 && parts.length > index + 2) {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: El nombre del algoritmo no puede contener espacios",
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    if (text.includes("<-") && text.indexOf("<-") === text.lastIndexOf("<-")) {
      const [leftPart, rightPart] = text.split("<-").map((part) => part.trim());
      if (leftPart !== "" && rightPart === "") {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: Falta una definición de valor",
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    const colonIndex = text.indexOf(":");
    if (colonIndex !== -1) {
      const leftPart = text.substring(0, colonIndex).trim();
      const rightPart = text.substring(colonIndex + 1).trim();
      if (leftPart !== "" && rightPart === "") {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: Falta la definición del tipo de variable",
            vscode.DiagnosticSeverity.Error
          )
        );
      } else if (leftPart === "" && rightPart !== "") {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: Falta el nombre de la variable",
            vscode.DiagnosticSeverity.Error
          )
        );
      } else if (leftPart === "" && rightPart === "") {
        diagnostics.push(
          new vscode.Diagnostic(
            range(0, line.text.length),
            "Error: Caracter desconocido",
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    const operators = [">=", "<>", ">", "<", "="];
    for (const operator of operators) {
      if (text.includes(operator)) {
        const [leftPart, rightPart] = text
          .split(operator)
          .map((part) => part.trim());
        if (leftPart !== "" && rightPart === "") {
          diagnostics.push(
            new vscode.Diagnostic(
              range(0, line.text.length),
              `Error: Se espera algo después de '${operator}'`,
              vscode.DiagnosticSeverity.Error
            )
          );
        } else if (leftPart === "" && rightPart !== "") {
          diagnostics.push(
            new vscode.Diagnostic(
              range(0, line.text.length),
              `Error: Se espera algo antes de '${operator}'`,
              vscode.DiagnosticSeverity.Error
            )
          );
        } else if (leftPart === "" && rightPart === "") {
          diagnostics.push(
            new vscode.Diagnostic(
              range(0, line.text.length),
              `Error: Se espera algo antes y después de '${operator}'`,
              vscode.DiagnosticSeverity.Error
            )
          );
        }
        break;
      }
    }

    if (text.includes("=>")) {
      diagnostics.push(
        new vscode.Diagnostic(
          range(0, line.text.length),
          "Error: '=>' no existe. ¿Querrás decir '>='?",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

    lineIndex++;
  }

  diagnosticCollection.clear();
  diagnosticCollection.set(document.uri, diagnostics);
}

function compiler() {
  if (!lebabOutputChannel) {
    lebabOutputChannel = vscode.window.createOutputChannel("EPAHighlighter");
  }
}

export function deactivate() {}
