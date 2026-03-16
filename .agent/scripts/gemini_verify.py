#!/usr/bin/env python3
"""
Gemini API CLI Verification Tool - ScanExam Edition
==================================================
Persona: Gemini CLI (Senior Advisor)
Objective: Multi-dimensional analysis of API Key health and model availability.
"""
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ANSI colors for senior advisor output
class CLIColors:
    GOLD = "\033[38;2;255;215;0m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    END = "\033[0m"

def print_cli_header(text):
    print(f"\n{CLIColors.BOLD}{CLIColors.GOLD}🤖 [GEMINI CLI ADVISOR]: {text}{CLIColors.END}")

def verify_all_keys():
    # Find .env relative to this script
    env_path = Path(__file__).resolve().parent.parent.parent / 'backend' / '.env'
    if not env_path.exists():
        print(f"{CLIColors.RED}❌ Error: .env not found at {env_path}{CLIColors.END}")
        return

    load_dotenv(env_path)
    api_keys_raw = os.getenv("GEMINI_API_KEY", "")
    api_keys = [k.strip() for k in api_keys_raw.split(',') if k.strip()]

    print_cli_header(f"Analyzing {len(api_keys)} API Keys detected in registry.")

    # High-performance models to verify
    models_to_test = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest"
    ]

    for i, key in enumerate(api_keys):
        masked_key = f"{key[:6]}...{key[-4:]}"
        print(f"\n{CLIColors.BOLD}{CLIColors.CYAN}--- Audit for Key [{i+1}] ({masked_key}) ---{CLIColors.END}")
        
        for model in models_to_test:
            try:
                client = genai.Client(api_key=key)
                start = time.time()
                response = client.models.generate_content(
                    model=model,
                    contents="Hi"
                )
                lat = (time.time() - start) * 1000
                print(f"  {CLIColors.GREEN}✅ {model:<20} | Status: OK | Latency: {lat:.0f}ms{CLIColors.END}")
            except Exception as e:
                msg = str(e)
                if "429" in msg:
                    print(f"  {CLIColors.YELLOW}⚠️  {model:<20} | Status: QUOTA EXCEEDED (429){CLIColors.END}")
                elif "404" in msg:
                    print(f"  {CLIColors.RED}❌ {model:<20} | Status: NOT FOUND (404){CLIColors.END}")
                else:
                    print(f"  {CLIColors.RED}❌ {model:<20} | Status: CRITICAL ERROR - {msg[:50]}...{CLIColors.END}")

    print_cli_header("Audit Complete. Finalizing multi-agent consensus report...")

if __name__ == "__main__":
    verify_all_keys()
