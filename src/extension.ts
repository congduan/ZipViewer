import * as vscode from 'vscode';
import {ZipEditorProvider} from "./editor";

export function activate(context: vscode.ExtensionContext) {
	
	let openZipFile = vscode.commands.registerCommand('zipviewer.open', () => {
		vscode.window.showInformationMessage('Hello World from ZipViewer!');
	});

	context.subscriptions.push(openZipFile);
	context.subscriptions.push(ZipEditorProvider.register(context));
}

export function deactivate() {}
