"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
var vscode = require("vscode");
var connectionDecorationType;
var siStack = [];
var desdeStack = [];
var mientrasStack = [];
var segunStack = [];
var diagnosticCollection;
function activate(context) {
    diagnosticCollection =
        vscode.languages.createDiagnosticCollection("myExtension");
    var editor = vscode.window.activeTextEditor;
    if (editor) {
        updateDecoration(editor);
    }
    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        if (editor) {
            updateDecoration(editor);
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(function (event) {
        var editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecoration(editor);
        }
    }, null, context.subscriptions);
}
exports.activate = activate;
function updateDecoration(editor) {
    var document = editor.document;
    var lines = [];
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
function decorateLines(document, startLine, lines) {
    var lineIndex = startLine;
    var diagnostics = [];
    while (lineIndex < document.lineCount) {
        var line = document.lineAt(lineIndex);
        var text = line.text.trim();
        if (text.toLowerCase().startsWith("FIN SI".toLowerCase()) ||
            text.toLowerCase().startsWith("FINSI".toLowerCase())) {
            var parentSi = siStack.pop();
            if (parentSi) {
                var decoration = {
                    range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
                    hoverMessage: "".concat(parentSi.text, " (L\u00EDnea ").concat(parentSi.line + 1, ")"),
                };
                lines.push(decoration);
            }
        }
        else if (text.toLowerCase().startsWith("SI ".toLowerCase())) {
            siStack.push({
                line: lineIndex,
                indent: line.firstNonWhitespaceCharacterIndex,
                text: text,
            });
        }
        else if (text.toLowerCase().startsWith("FIN DESDE".toLowerCase()) ||
            text.toLowerCase().startsWith("FINDESDE".toLowerCase())) {
            var parentDesde = desdeStack.pop();
            if (parentDesde) {
                var decoration = {
                    range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
                    hoverMessage: "".concat(parentDesde.text, " (L\u00EDnea ").concat(parentDesde.line + 1, ")"),
                };
                lines.push(decoration);
            }
        }
        else if (text.toLowerCase().startsWith("DESDE ".toLowerCase())) {
            desdeStack.push({
                line: lineIndex,
                indent: line.firstNonWhitespaceCharacterIndex,
                text: text,
            });
        }
        else if (text.toLowerCase().startsWith("FIN MIENTRAS".toLowerCase()) ||
            text.toLowerCase().startsWith("FINMIENTRAS".toLowerCase())) {
            var parentMientras = mientrasStack.pop();
            if (parentMientras) {
                var decoration = {
                    range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
                    hoverMessage: "".concat(parentMientras.text, " (L\u00EDnea ").concat(parentMientras.line + 1, ")"),
                };
                lines.push(decoration);
            }
        }
        else if (text.toLowerCase().startsWith("MIENTRAS ".toLowerCase())) {
            mientrasStack.push({
                line: lineIndex,
                indent: line.firstNonWhitespaceCharacterIndex,
                text: text,
            });
        }
        else if (text.toLowerCase().startsWith("FIN SEGUN".toLowerCase()) ||
            text.toLowerCase().startsWith("FINSEGUN".toLowerCase())) {
            var parentSegun = segunStack.pop();
            if (parentSegun) {
                var decoration = {
                    range: new vscode.Range(lineIndex, 0, lineIndex, line.text.length),
                    hoverMessage: "".concat(parentSegun.text, " (L\u00EDnea ").concat(parentSegun.line + 1, ")"),
                };
                lines.push(decoration);
            }
        }
        else if (text.toLowerCase().startsWith("SEGUN ".toLowerCase())) {
            segunStack.push({
                line: lineIndex,
                indent: line.firstNonWhitespaceCharacterIndex,
                text: text,
            });
        }
        if (text.toLowerCase().includes("algoritmo")) {
            var parts = text.split(" ");
            var index = parts.findIndex(function (part) { return part.toLowerCase() === "algoritmo"; });
            if (index !== -1 &&
                (parts.length === index + 1 || parts[index + 1].trim() === "")) {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: El algoritmo no tiene nombre", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            else if (index !== -1 && parts.length > index + 2) {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: El nombre del algoritmo no puede contener espacios", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
        }
        if (text.includes("<-") && text.indexOf("<-") === text.lastIndexOf("<-")) {
            var parts = text.split("<-");
            var leftPart = parts[0].trim();
            var rightPart = parts[1].trim();
            if (leftPart !== "" && rightPart === "") {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Falta una definicion de valor", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
        }
        var colonIndex = text.indexOf(":");
        if (colonIndex !== -1) {
            var leftPart = text.substring(0, colonIndex).trim();
            var rightPart = text.substring(colonIndex + 1).trim();
            if (leftPart !== "" && rightPart === "") {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Falta la definicion del tipo de variable", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            else if (leftPart === "" && rightPart !== "") {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Falta el nombre de la variable", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            else if (leftPart === "" && rightPart === "") {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Caracter desconocido", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
        }
        if (text.includes('>') || text.includes('<') || text.includes('=') || text.includes('>=') || text.includes('=<')) {
            var operator = '';
            if (text.includes('>=')) {
                operator = '>=';
            }
            else if (text.includes('<>')) {
                operator = '<>';
            }
            else if (text.includes('>')) {
                operator = '>';
            }
            else if (text.includes('<')) {
                operator = '<';
            }
            else {
                operator = '=';
            }
            var parts = text.split(operator);
            var leftPart = parts[0].trim();
            var rightPart = parts[1] ? parts[1].trim() : '';
            if (leftPart !== '' && rightPart === '') {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Se espera algo despu\u00E9s de '".concat(operator, "'"), vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            else if (leftPart === '' && rightPart !== '') {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Se espera algo antes de '".concat(operator, "'"), vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            else if (leftPart === '' && rightPart === '') {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: Se espera algo antes y despu\u00E9s de '".concat(operator, "'"), vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            if (text.includes('=>')) {
                var diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.text.length), "Error: '=>' no existe. \u00BFQuerr\u00E1s decir '>='?", vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
        }
        lineIndex++;
    }
    diagnosticCollection.clear();
    diagnosticCollection.set(document.uri, diagnostics);
}
function deactivate() { }
exports.deactivate = deactivate;
