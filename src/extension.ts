import * as vscode from "vscode";
import { ZipEditorProvider } from "./editor";

export let storageDir = "";

export function activate(context: vscode.ExtensionContext) {
  storageDir =
    context.storageUri?.fsPath === undefined ? "" : context.storageUri?.fsPath;

  context.subscriptions.push(ZipEditorProvider.register(context));
}

export function deactivate() {}
