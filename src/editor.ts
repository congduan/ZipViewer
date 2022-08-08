import {
  Uri,
  CustomDocument,
  CustomDocumentOpenContext,
  CustomReadonlyEditorProvider,
  ExtensionContext,
  Disposable,
  window,
  Webview,
  commands,
  WebviewPanel,
  CancellationToken,
} from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as AdmZip from "adm-zip";
import { storageDir } from "./extension";

let openedFileUri: Uri | undefined = undefined;

class ZipDocument implements CustomDocument {
  static async create(
    uri: Uri,
    imgPlaceholderPath: string
  ): Promise<ZipDocument | PromiseLike<ZipDocument>> {
    const zip = new AdmZip(uri.fsPath);
    const zipEntries = zip.getEntries();
    let header: string = `<a href="${uri.fsPath}" onclick="revealFile('${uri.fsPath}');return false;">${uri.fsPath}</a><br/>`;
    let data: string = "";
    header += getFileSize(uri.fsPath);
    data += "<ol>";
    for (let zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }
      const name = zipEntry.entryName;
      let style = "";
      data += `<li><a ${style} href="${name}" onclick="openFileFromZip('${name}');return false;">${name}</a></li>`;
      data += zipEntry.comment;
      data += `size: ${zipEntry.header.size} bytes ==> ${zipEntry.header.compressedSize} bytes <br/>`;
      data += `<br/>`;
    }
    data += "</ol>";

    let texts: string[] = [];

    const text = texts.join("<hr/><br>");
    const html = `<table>
    <tr>
      <td colspan=2>${header}</td>
    </tr>
    <tr>
      <td width=50%>${data}</td>
      <td width=50%>${text}</td>
    </tr>
  </table>`;
    return new ZipDocument(uri, html);
  }

  private readonly _uri: Uri;
  private _data: string;

  public get uri() {
    return this._uri;
  }

  public get data() {
    return this._data;
  }

  private constructor(uri: Uri, data: string) {
    this._uri = uri;
    this._data = data;
  }

  dispose(): void {
    openedFileUri = undefined;
  }
}

export class ZipEditorProvider implements CustomReadonlyEditorProvider {
  public static register(context: ExtensionContext): Disposable {
    const provider = new ZipEditorProvider(context);
    const providerRegistration = window.registerCustomEditorProvider(
      ZipEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  private static readonly viewType = "zipviewer.editor";

  constructor(private readonly context: ExtensionContext) {}

  public async resolveCustomEditor(
    document: ZipDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(
      webviewPanel.webview,
      document.data
    );

    webviewPanel.webview.onDidReceiveMessage((msg) => {
      switch (msg.command) {
        case "alert":
          window.showInformationMessage(msg.text);
          return;
        case "openFile":
          if (openedFileUri !== undefined) {
            const zip = new AdmZip(openedFileUri.fsPath);
            const path = extractFileFromZip(zip, msg.entryName);
            if (path === undefined || path === "") {
              window.showInformationMessage(
                `extract entry ${msg.entryName} failed`
              );
            }
            commands.executeCommand("workbench.action.closeActiveEditor");
            commands.executeCommand("vscode.open", path);
          }
          return;
        case "revealFile":
          commands.executeCommand("revealFileInOS", Uri.parse(msg.path));
          return;
      }
    });
  }

  public async openCustomDocument(
    uri: Uri,
    openContext: CustomDocumentOpenContext,
    token: CancellationToken
  ): Promise<ZipDocument> {
    openedFileUri = uri;
    const imagePath = getExtensionFileVscodeResource(
      this.context,
      "resources/images/no_img.png"
    );
    const document: ZipDocument = await ZipDocument.create(uri, imagePath);
    return document;
  }

  private getHtmlForWebview(webview: Webview, data: string): string {
    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<title>Zip File Viewer</title>
        <style media = "all">
          li {
            margin-bottom: 10px; 
          }
          table, th, td {
            border: 1px solid white;
            vertical-align: top;
            border-collapse:collapse;
          }
          th, td {
            padding: 10px;
          }
          table {
            width: 100%
          }
        </style>
        <script>
          const vscode = acquireVsCodeApi();
          function openFileFromZip(name) {
            vscode.postMessage({
              command: 'openFile',
              entryName: name,
            });
          }
          function revealFile(path) {
            console.log("reveal file: " + path);
            vscode.postMessage({
              command: 'revealFile',
              path: path,
            });
          }
        </script>
			</head>
			<body>
				<p>${data}</p>
			</body>
			</html>`;
  }
}

function getFileSize(filename: string): string {
  const size = 1000;
  let stats = fs.statSync(filename);
  let fileSizeInBytes = stats.size;
  let fileSize = fileSizeInBytes;
  let unit = "B";
  if (fileSize > size) {
    fileSize = fileSize / size;
    unit = "KB";
    if (fileSize > size) {
      fileSize = fileSize / size;
      unit = "MB";
    }
  }
  return (
    `<p style="color:Tomato;">file size : ` +
    `${fileSize.toFixed(2)}${unit} (${fileSizeInBytes}B) </p>`
  );
}

function getExtensionFileVscodeResource(
  context: ExtensionContext,
  relativePath: string
): string {
  const diskPath = Uri.file(path.join(context.extensionPath, relativePath));
  return diskPath.with({ scheme: "vscode-resource" }).toString();
}

const cacheDir = "cache";

export function extractFileFromZip(zip: AdmZip, entryName: string) {
  const filePath = path.join(storageDir, cacheDir, entryName);
  const success = zip.extractEntryTo(
    entryName,
    path.join(storageDir, cacheDir),
    true,
    true
  );
  if (success) {
    return Uri.parse(filePath);
  }
  return "";
}
