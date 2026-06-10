import argparse
import asyncio
import os
import sys
import tiktoken
from colorama import Fore, Style, init

from bot_v3 import ProductionBotV3

# Initialize Colorama
init(autoreset=True)

IGNORED_DIRS = {".git", "__pycache__", "node_modules", "venv", "env", ".venv"}
IGNORED_EXTS = {".log", ".exe", ".dll", ".so", ".dylib", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz"}
MAX_TOKENS = 10000

def get_codebase_context(directory: str) -> str:
    if not os.path.isdir(directory):
        print(f"{Fore.RED}Error: Directory '{directory}' does not exist.{Style.RESET_ALL}")
        sys.exit(1)
        
    try:
        tokenizer = tiktoken.get_encoding("cl100k_base")
    except Exception:
        tokenizer = None
        
    context_lines = []
    current_tokens = 0
    
    print(f"{Fore.CYAN}Scanning directory: {directory}{Style.RESET_ALL}")
    
    for root, dirs, files in os.walk(directory):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORED_EXTS or file.startswith("."):
                continue
                
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, directory)
            
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue # Skip binary or unreadable files
                
            file_block = f"\n--- File: {rel_path} ---\n{content}\n"
            
            if tokenizer:
                tokens = len(tokenizer.encode(file_block))
            else:
                tokens = len(file_block.split())
                
            if current_tokens + tokens > MAX_TOKENS:
                print(f"{Fore.YELLOW}Warning: Token limit ({MAX_TOKENS}) reached. Truncating remaining files.{Style.RESET_ALL}")
                break
                
            context_lines.append(file_block)
            current_tokens += tokens
            
        if current_tokens > MAX_TOKENS:
            break
            
    print(f"{Fore.GREEN}Loaded ~{current_tokens} tokens of codebase context.{Style.RESET_ALL}")
    
    system_prompt = (
        "You are a Senior Code Reviewer and Architect. "
        "The user has provided the following codebase context. "
        "Answer questions about this codebase accurately based on the provided files.\n"
        "<codebase>\n" + "".join(context_lines) + "\n</codebase>"
    )
    
    return system_prompt

async def main():
    parser = argparse.ArgumentParser(description="Codebase Explainer Tool")
    parser.add_argument("directory", type=str, help="Path to the directory to explain")
    parser.add_argument("--provider", type=str, choices=["openai", "gemini", "anthropic"], default="openai")
    args = parser.parse_args()
    
    system_prompt = get_codebase_context(args.directory)
    
    # Initialize bot with the massive system prompt
    bot = ProductionBotV3(provider=args.provider, system_prompt=system_prompt)
    await bot.chat_loop()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
