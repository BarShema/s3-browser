#!/bin/bash

# PM2 Management Script for S3 Browser
# Usage: ./scripts/pm2-manage.sh <action> <env>
# Actions: start, stop, restart, delete, logs, status
# Environments: dev, prd, lcl

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ACTION=${1:-status}
ENV=${2:-dev}

APP_NAME="s3-browser-$ENV"
CONFIG_FILE="app.config.$ENV.json"

if [ ! -f "$PROJECT_DIR/$CONFIG_FILE" ]; then
    echo "Error: Config file $CONFIG_FILE not found"
    exit 1
fi

cd "$PROJECT_DIR"

case $ACTION in
    start)
        echo "Starting $APP_NAME..."
        echo $CONFIG_FILE
        pm2 start "$CONFIG_FILE" --env production
        pm2 save
        echo "$APP_NAME started successfully"
        pm2 status
        ;;
    stop)
        echo "Stopping $APP_NAME..."
        pm2 stop "$APP_NAME"
        pm2 save
        echo "$APP_NAME stopped successfully"
        ;;
    restart)
        echo "Restarting $APP_NAME..."
        pm2 restart "$APP_NAME"
        pm2 save
        echo "$APP_NAME restarted successfully"
        ;;
    delete)
        echo "Deleting $APP_NAME..."
        pm2 delete "$APP_NAME"
        pm2 save
        echo "$APP_NAME deleted successfully"
        ;;
    logs)
        echo "Showing logs for $APP_NAME..."
        pm2 logs "$APP_NAME"
        ;;
    status)
        echo "Status for $APP_NAME:"
        pm2 show "$APP_NAME" 2>/dev/null || echo "$APP_NAME is not running"
        ;;
    *)
        echo "Usage: $0 <action> <env>"
        echo "Actions: start, stop, restart, delete, logs, status"
        echo "Environments: dev, prd, lcl"
        exit 1
        ;;
esac

