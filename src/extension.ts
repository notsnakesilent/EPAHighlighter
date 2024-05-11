import * as vscode from "vscode";

let connectionDecorationType: vscode.TextEditorDecorationType | undefined;
let siStack: { line: number; indent: number; text: string }[] = [];
let desdeStack: { line: number; indent: number; text: string }[] = [];
let mientrasStack: { line: number; indent: number; text: string }[] = [];
let segunStack: { line: number; indent: number; text: string }[] = [];
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
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


export function deactivate() {}
