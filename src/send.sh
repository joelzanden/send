#!/bin/sh

if [ $# -eq 0 ]; then
  echo "Usage: send <file>"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed or not in PATH"
  exit 1
fi

response=$(curl -s -F "file=@$1" https://dropdrop.download)
status=$?

if [ $status -ne 0 ]; then
  echo "Error: Failed to upload file"
  exit 1
fi

echo "$response"
