import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';

let connectionDecorationType: vscode.TextEditorDecorationType | undefined;
let siStack: { line: number; indent: number; text: string }[] = [];
let desdeStack: { line: number; indent: number; text: string }[] = [];
let mientrasStack: { line: number; indent: number; text: string }[] = [];
let segunStack: { line: number; indent: number; text: string }[] = [];
let diagnosticCollection: vscode.DiagnosticCollection;
let lebabOutputChannel: vscode.OutputChannel | undefined;
const subAlgoritmos: { [key: string]: number } = {};
const subAlgoritmosParams: { [key: string]: { E: string[], S: string[] } } = {};
const functionCallRegex = /(?:\d+\s*:)?\s*([a-zA-Z_]\w*)\s*\(/g;



export async function activate(context: vscode.ExtensionContext) {



	let disposable = vscode.commands.registerCommand('extension.helpmode', () => {
        modifySnippet();
    });

    if (!lebabOutputChannel) {
        lebabOutputChannel = vscode.window.createOutputChannel('EPAHighlighter');
	}
	
	diagnosticCollection =
		vscode.languages.createDiagnosticCollection("myExtension");

	const editor = vscode.window.activeTextEditor;
	if (editor) {
		updateDecoration(editor);
	}

	vscode.window.onDidChangeActiveTextEditor(
		(editor) => {
			if (editor) {
				updateDecoration(editor);
			}
		},
		null,
		context.subscriptions
	);		

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

async function modifySnippet() {

	const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active text editor found.');
        return;
    }

    const document = editor.document;
    const filePath = document.uri.fsPath;
    const fileExt = path.extname(filePath);

	  if (fileExt === '.epah') {
		
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active text editor found.');
			return;
		}
	
		const newFilePath = filePath.replace(/\.[^/.]+$/, '.epa'); 

		const result = await vscode.window.showInformationMessage(
			'Queres desactivar el HelpMode? Esto cambiara la extension del archivo de .epah a .epa. El historial de Ctrl+Z y similares se borrara',
			'Si',
			'No'
		);
	
		if (result === 'Si') {
			try {

				await document.save();
				fs.writeFileSync(newFilePath, document.getText(), 'utf8');
				
			
				fs.unlinkSync(filePath);
				

				vscode.window.showInformationMessage('File saved as .epa and original file deleted.');
				
				const newDocument = await vscode.workspace.openTextDocument(newFilePath);
				await vscode.window.showTextDocument(newDocument);
	
				const oldEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.fsPath === filePath);
				if (oldEditor) {
					await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				}

				await vscode.commands.executeCommand('workbench.action.reloadWindow');
			} catch (error) {
				vscode.window.showErrorMessage(`Error`);
			}
		} else {
			vscode.window.showInformationMessage('Operacion cancelada.');
		}
	}
	else if (fileExt === '.epa') {


		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active text editor found.');
			return;
		}
		const document = editor.document;
		const filePath = document.uri.fsPath;
		const newFilePath = filePath.replace(/\.[^/.]+$/, '.epah'); 

		const result = await vscode.window.showInformationMessage(
			'Queres activar el HelpMode? Esto cambiara la extension del archivo de .epa a .epah. El historial de Ctrl+Z y similares se borrara',
			'Si',
			'No'
		);
	
		if (result === 'Si') {
			try {

				await document.save();
				fs.writeFileSync(newFilePath, document.getText(), 'utf8');
				
			
				fs.unlinkSync(filePath);
				

				vscode.window.showInformationMessage('File saved as .epah and original file deleted.');
				
				const newDocument = await vscode.workspace.openTextDocument(newFilePath);
				await vscode.window.showTextDocument(newDocument);
	
				const oldEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.fsPath === filePath);
				if (oldEditor) {
					await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				}

				await vscode.commands.executeCommand('workbench.action.reloadWindow');
			} catch (error) {
				vscode.window.showErrorMessage(`Error`);
			}
		} else {
			vscode.window.showInformationMessage('Operation cancelada.');
		}
	

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
        const range = (start: number, end: number) => new vscode.Range(lineIndex, start, lineIndex, end);

        if (text.startsWith("fin si") || text.startsWith("finsi")) {
            const parentSi = siStack.pop();
            if (parentSi) {
                lines.push({
                    range: range(0, line.text.length),
                    hoverMessage: `${parentSi.text} (Línea ${parentSi.line + 1})`
                });
            }
        } else if (text.startsWith("si ")) {
            siStack.push({ line: lineIndex, indent: line.firstNonWhitespaceCharacterIndex, text });
        }

        if (text.startsWith("fin desde") || text.startsWith("findesde")) {
            const parentDesde = desdeStack.pop();
            if (parentDesde) {
                lines.push({
                    range: range(0, line.text.length),
                    hoverMessage: `${parentDesde.text} (Línea ${parentDesde.line + 1})`
                });
            }
        } else if (text.startsWith("desde ")) {
            desdeStack.push({ line: lineIndex, indent: line.firstNonWhitespaceCharacterIndex, text });
        }

        if (text.startsWith("fin mientras") || text.startsWith("finmientras")) {
            const parentMientras = mientrasStack.pop();
            if (parentMientras) {
                lines.push({
                    range: range(0, line.text.length),
                    hoverMessage: `${parentMientras.text} (Línea ${parentMientras.line + 1})`
                });
            }
        } else if (text.startsWith("mientras ")) {
            mientrasStack.push({ line: lineIndex, indent: line.firstNonWhitespaceCharacterIndex, text });
        }

        if (text.startsWith("fin segun") || text.startsWith("finsegun")) {
            const parentSegun = segunStack.pop();
            if (parentSegun) {
                lines.push({
                    range: range(0, line.text.length),
                    hoverMessage: `${parentSegun.text} (Línea ${parentSegun.line + 1})`
                });
            }
        } else if (text.startsWith("segun ")) {
            segunStack.push({ line: lineIndex, indent: line.firstNonWhitespaceCharacterIndex, text });
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
                        hoverMessage: `Declarado en la línea ${declarationLine + 1}.`
                    });
                }
            }
        }

        if (text.includes("algoritmo")) {
            const parts = text.split(" ");
            const index = parts.findIndex(part => part === "algoritmo");
            if (index !== -1 && (parts.length === index + 1 || parts[index + 1].trim() === "")) {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: El algoritmo no tiene nombre", vscode.DiagnosticSeverity.Error));
            } else if (index !== -1 && parts.length > index + 2) {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: El nombre del algoritmo no puede contener espacios", vscode.DiagnosticSeverity.Error));
            }
        }

        if (text.includes("<-") && text.indexOf("<-") === text.lastIndexOf("<-")) {
            const [leftPart, rightPart] = text.split("<-").map(part => part.trim());
            if (leftPart !== "" && rightPart === "") {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: Falta una definición de valor", vscode.DiagnosticSeverity.Error));
            }
        }

        const colonIndex = text.indexOf(":");
        if (colonIndex !== -1) {
            const leftPart = text.substring(0, colonIndex).trim();
            const rightPart = text.substring(colonIndex + 1).trim();
            if (leftPart !== "" && rightPart === "") {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: Falta la definición del tipo de variable", vscode.DiagnosticSeverity.Error));
            } else if (leftPart === "" && rightPart !== "") {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: Falta el nombre de la variable", vscode.DiagnosticSeverity.Error));
            } else if (leftPart === "" && rightPart === "") {
                diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: Caracter desconocido", vscode.DiagnosticSeverity.Error));
            }
        }

        const operators = ['>=', '<>', '>', '<', '='];
        for (const operator of operators) {
            if (text.includes(operator)) {
                const [leftPart, rightPart] = text.split(operator).map(part => part.trim());
                if (leftPart !== "" && rightPart === "") {
                    diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), `Error: Se espera algo después de '${operator}'`, vscode.DiagnosticSeverity.Error));
                } else if (leftPart === "" && rightPart !== "") {
                    diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), `Error: Se espera algo antes de '${operator}'`, vscode.DiagnosticSeverity.Error));
                } else if (leftPart === "" && rightPart === "") {
                    diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), `Error: Se espera algo antes y después de '${operator}'`, vscode.DiagnosticSeverity.Error));
                }
                break;
            }
        }

        if (text.includes('=>')) {
            diagnostics.push(new vscode.Diagnostic(range(0, line.text.length), "Error: '=>' no existe. ¿Querrás decir '>='?", vscode.DiagnosticSeverity.Error));
        }

        lineIndex++;
    }

    diagnosticCollection.clear();
    diagnosticCollection.set(document.uri, diagnostics);
}

function compiler() {

	if (!lebabOutputChannel) {
        lebabOutputChannel = vscode.window.createOutputChannel('EPAHighlighter');
	}

}

export function deactivate() {}
