import * as AdmZip from "adm-zip";
import {Uri} from "vscode";

function listEntries(uri: Uri) {
    const zip = new AdmZip(uri.fsPath);
    const entries = zip.getEntries();
    
}