#!/bin/bash

# build
echo "------- build: vsce package..."
vsce package
echo "build: finished."

# reinstall
echo "------- uninstall extension..."
code --uninstall-extension congduan.zipviewer
echo "-------  reinstall extension..."
code --install-extension zipviewer-0.0.1.vsix --force

echo "deploy finished :)"