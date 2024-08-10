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
		const text = line.text.trim();

		if (
			text.toLowerCase().startsWith("FIN SI".toLowerCase()) ||
			text.toLowerCase().startsWith("FINSI".toLowerCase())
		) {
			const parentSi = siStack.pop();
			if (parentSi) {
				const decoration = {
					range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					hoverMessage: `${parentSi.text} (Línea ${parentSi.line + 1})`, 
				};
				lines.push(decoration);
			}
		} else if (text.toLowerCase().startsWith("SI ".toLowerCase())) {
			siStack.push({
				line: lineIndex,
				indent: line.firstNonWhitespaceCharacterIndex,
				text,
			}); 
		}
		

		else if (
			text.toLowerCase().startsWith("FIN DESDE".toLowerCase()) ||
			text.toLowerCase().startsWith("FINDESDE".toLowerCase())
		) {
			const parentDesde = desdeStack.pop();
			if (parentDesde) {
				const decoration = {
					range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					hoverMessage: `${parentDesde.text} (Línea ${parentDesde.line + 1})`, 
				};
				lines.push(decoration);
			}
		} else if (text.toLowerCase().startsWith("DESDE ".toLowerCase())) {
			desdeStack.push({
				line: lineIndex,
				indent: line.firstNonWhitespaceCharacterIndex,
				text,
			}); 
		}

		else if (
			text.toLowerCase().startsWith("FIN MIENTRAS".toLowerCase()) ||
			text.toLowerCase().startsWith("FINMIENTRAS".toLowerCase())
		) {
			const parentMientras = mientrasStack.pop();
			if (parentMientras) {
				const decoration = {
					range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					hoverMessage: `${parentMientras.text} (Línea ${
						parentMientras.line + 1
					})`, 
				};
				lines.push(decoration);
			}
		} else if (text.toLowerCase().startsWith("MIENTRAS ".toLowerCase())) {
			mientrasStack.push({
				line: lineIndex,
				indent: line.firstNonWhitespaceCharacterIndex,
				text,
			}); 
		}

		else if (
			text.toLowerCase().startsWith("FIN SEGUN".toLowerCase()) ||
			text.toLowerCase().startsWith("FINSEGUN".toLowerCase())
		) {
			const parentSegun = segunStack.pop();
			if (parentSegun) {
				const decoration = {
					range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					hoverMessage: `${parentSegun.text} (Línea ${parentSegun.line + 1})`, 
				};
				lines.push(decoration);
			}
		} else if (text.toLowerCase().startsWith("SEGUN ".toLowerCase())) {
			segunStack.push({
				line: lineIndex,
				indent: line.firstNonWhitespaceCharacterIndex,
				text,
			});
		}

		else if (text.toLowerCase().startsWith("subalgoritmo ".toLowerCase())) {
            const subAlgoritmoNameMatch = text.match(/subalgoritmo\s+(\w+)/i);
            if (subAlgoritmoNameMatch && subAlgoritmoNameMatch[1]) {
                const subAlgoritmoName = subAlgoritmoNameMatch[1];
                subAlgoritmos[subAlgoritmoName] = lineIndex; // Guardar la línea de la declaración
            }
        }
        // Detectar llamadas a subalgoritmos
        else {
            let match;
            while ((match = functionCallRegex.exec(text)) !== null) {
                const functionName = match[1];
                const declarationLine = subAlgoritmos[functionName];
                if (declarationLine !== undefined) {
                    const hoverMessage = `Declarado en la línea ${declarationLine + 1}.`;
                    const decoration = {
                        range: new vscode.Range(lineIndex, match.index, lineIndex, match.index + match[0].length),
                        hoverMessage,
                    };
                    lines.push(decoration);
                }
            }
		

		if (text.toLowerCase().includes("algoritmo")) {
			const parts = text.split(" "); 
			const index = parts.findIndex(
				(part) => part.toLowerCase() === "algoritmo"
			);

			if (
				index !== -1 &&
				(parts.length === index + 1 || parts[index + 1].trim() === "")
			) {
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: El algoritmo no tiene nombre",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			} else if (index !== -1 && parts.length > index + 2) {

				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: El nombre del algoritmo no puede contener espacios",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			}
		}

		if (text.includes("<-") && text.indexOf("<-") === text.lastIndexOf("<-")) {
			const parts = text.split("<-");
			const leftPart = parts[0].trim();
			const rightPart = parts[1].trim();
			if (leftPart !== "" && rightPart === "") {
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: Falta una definicion de valor",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			}
		}

		const colonIndex = text.indexOf(":"); 
		if (colonIndex !== -1) {
			const leftPart = text.substring(0, colonIndex).trim(); 
			const rightPart = text.substring(colonIndex + 1).trim(); 
			if (leftPart !== "" && rightPart === "") {

				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: Falta la definicion del tipo de variable",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			} else if (leftPart === "" && rightPart !== "") {
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: Falta el nombre de la variable",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			} else if (leftPart === "" && rightPart === "") {
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
					"Error: Caracter desconocido",
					vscode.DiagnosticSeverity.Error
				);
				diagnostics.push(diagnostic);
			}
		}

		if (text.includes('>') || text.includes('<') || text.includes('=') || text.includes('>=') || text.includes('=<')) {
			let operator: string = '';
			if (text.includes('>=')) {
				operator = '>=';
			} else if (text.includes('<>')) {
				operator = '<>';
			} else if (text.includes('>')) {
				operator = '>';
			} else if (text.includes('<')) {
				operator = '<';
			} else {
				operator = '=';
			}
		
			const parts = text.split(operator); 
			const leftPart = parts[0].trim(); 
			const rightPart = parts[1] ? parts[1].trim() : ''; 
		
			if (leftPart !== '' && rightPart === '') {
				const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), `Error: Se espera algo después de '${operator}'`, vscode.DiagnosticSeverity.Error);
				diagnostics.push(diagnostic);
			} else if (leftPart === '' && rightPart !== '') {
				const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), `Error: Se espera algo antes de '${operator}'`, vscode.DiagnosticSeverity.Error);
				diagnostics.push(diagnostic);
			} else if (leftPart === '' && rightPart === '') {
				const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), `Error: Se espera algo antes y después de '${operator}'`, vscode.DiagnosticSeverity.Error);
				diagnostics.push(diagnostic);
			}

			if (text.includes('=>')) {
				const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), `Error: '=>' no existe. ¿Querrás decir '>='?`, vscode.DiagnosticSeverity.Error);
				diagnostics.push(diagnostic);
			} 
		}

		
		lineIndex++;
	}

	diagnosticCollection.clear();

	diagnosticCollection.set(document.uri, diagnostics);
}
}

function compiler() {

	if (!lebabOutputChannel) {
        lebabOutputChannel = vscode.window.createOutputChannel('EPAHighlighter');
	}

}

export function deactivate() {}
