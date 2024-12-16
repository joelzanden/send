#!/bin/sh

CONFIG_DIR="$HOME/.config/send"
TOKEN_FILE="$CONFIG_DIR/token"

# Ensure configuration directory exists
mkdir -p "$CONFIG_DIR"

# Check for user token or prompt for one
if [ ! -f "$TOKEN_FILE" ]; then
  echo "No token found. Please enter your API token:"
  read -r USER_TOKEN
  echo "$USER_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"  # Secure the token file
  echo "Token saved to $TOKEN_FILE"
else
  USER_TOKEN=$(cat "$TOKEN_FILE")
fi

if [ $# -eq 0 ]; then
  echo "Usage: send <file>"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed or not in PATH"
  exit 1
fi

response=$(curl -s -F "file=@$1" -H "Authorization: Bearer $USER_TOKEN" https://dropdrop.download)
status=$?

if [ $status -ne 0 ]; then
  echo "Error: Failed to upload file"
  exit 1
fi

echo "$response"
