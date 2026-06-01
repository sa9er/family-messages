#!/bin/bash

# Find the line numbers where AudioRecorder component starts and ends
START_LINE=$(grep -n "^const AudioRecorder" App.tsx | cut -d: -f1)
if [ -z "$START_LINE" ]; then
    echo "Could not find AudioRecorder component"
    exit 1
fi

# Find the end of the AudioRecorder component (look for the closing brace before the next component)
END_LINE=$(tail -n +$START_LINE App.tsx | grep -n "^const VideoRecorder" | head -1 | cut -d: -f1)
if [ -z "$END_LINE" ]; then
    END_LINE=$(tail -n +$START_LINE App.tsx | grep -n "^const MessageBubble" | head -1 | cut -d: -f1)
fi

if [ -n "$END_LINE" ]; then
    END_LINE=$((START_LINE + END_LINE - 1))
    # Create new file without old AudioRecorder
    head -n $((START_LINE - 1)) App.tsx > App.tsx.tmp
    # Add import for new AudioRecorder (if not already there)
    echo "import { AudioRecorder } from './AudioRecorderWorking';" >> App.tsx.tmp
    # Add the rest after the old AudioRecorder
    tail -n +$((END_LINE + 1)) App.tsx >> App.tsx.tmp
    mv App.tsx.tmp App.tsx
    echo "✅ Updated App.tsx to use working AudioRecorder"
else
    echo "Could not find end of AudioRecorder component"
fi
