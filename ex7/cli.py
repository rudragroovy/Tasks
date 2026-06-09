import argparse
from openai import OpenAI
import os
import sys
import json

# Load .env file manually if it exists
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip("'\"")

# ANSI escape codes for coloring
_USE_COLOR = sys.stdout.isatty() and os.getenv("NO_COLOR") is None
if _USE_COLOR:
    COLOR_BANNER = "\033[1;35m"  # Bold Magenta
    COLOR_USER = "\033[1;32m"    # Bold Green
    COLOR_AI = "\033[1;36m"      # Bold Cyan
    COLOR_SYSTEM = "\033[1;33m"  # Bold Yellow
    COLOR_GRAY = "\033[90m"      # Gray
    COLOR_RED = "\033[1;31m"     # Bold Red
    COLOR_RESET = "\033[0m"
else:
    COLOR_BANNER = ""
    COLOR_USER = ""
    COLOR_AI = ""
    COLOR_SYSTEM = ""
    COLOR_GRAY = ""
    COLOR_RED = ""
    COLOR_RESET = ""

history_path = os.path.join(os.path.dirname(__file__), "history.json")

def load_history():
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"{COLOR_RED}Error loading history: {e}{COLOR_RESET}")
    return []

def save_history(messages):
    try:
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(messages, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"{COLOR_RED}Error saving history: {e}{COLOR_RESET}")

def main():
    parser = argparse.ArgumentParser(description="Multi-Provider Chat CLI")
    parser.add_argument(
        "--provider",
        type=str,
        choices=["openai", "gemini", "anthropic"],
        default="openai",
        help="Choose the model provider"
    )
    args = parser.parse_args()

    # Map providers to OpenRouter models
    provider_models = {
        "openai": "openai/gpt-4o-mini",
        "gemini": "google/gemini-2.5-flash",
        "anthropic": "anthropic/claude-3-haiku"
    }
    model = provider_models[args.provider]

    # Load env keys
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print(f"{COLOR_RED}Error: OPENROUTER_API_KEY environment variable not found. Please check your .env file.{COLOR_RESET}")
        sys.exit(1)
        
    # Initialize client (OpenRouter acts as proxy for all providers)
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )
    
    # Load history
    messages = load_history()
    
    print(f"{COLOR_BANNER}=================================================={COLOR_RESET}")
    print(f"{COLOR_BANNER}           Welcome to OpenRouter Chat CLI!        {COLOR_RESET}")
    print(f"{COLOR_BANNER}=================================================={COLOR_RESET}")
    print(f"Provider selected: {COLOR_SYSTEM}{args.provider}{COLOR_RESET}")
    print(f"Using Model: {COLOR_SYSTEM}{model}{COLOR_RESET}")
    
    if messages:
        user_turns = sum(1 for m in messages if m.get("role") == "user")
        print(f"Loaded {COLOR_SYSTEM}{user_turns}{COLOR_RESET} previous turn(s) of conversation history from history.json.")
        print(f"Type {COLOR_SYSTEM}/history{COLOR_RESET} to view, or {COLOR_SYSTEM}/clear{COLOR_RESET} to start fresh.")
    else:
        print("No previous chat history found. Starting a new session.")
        
    print(f"\nCommands: {COLOR_GRAY}/clear{COLOR_RESET} (reset chat), {COLOR_GRAY}/history{COLOR_RESET} (view chat), {COLOR_GRAY}/exit{COLOR_RESET} (quit)")
    print(f"{COLOR_BANNER}--------------------------------------------------{COLOR_RESET}\n")

    while True:
        try:
            # Prompt user
            user_input = input(f"{COLOR_USER}You > {COLOR_RESET} ").strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n{COLOR_SYSTEM}Exiting chat. Goodbye!{COLOR_RESET}")
            break
            
        if not user_input:
            continue
            
        # Command checks
        if user_input.lower() in ["/exit", "/quit"]:
            print(f"{COLOR_SYSTEM}Exiting chat. Goodbye!{COLOR_RESET}")
            break
            
        if user_input.lower() == "/clear":
            messages = []
            if os.path.exists(history_path):
                try:
                    os.remove(history_path)
                except Exception as e:
                    pass
            print(f"{COLOR_SYSTEM}Chat history cleared.{COLOR_RESET}\n")
            continue
            
        if user_input.lower() == "/history":
            if not messages:
                print(f"{COLOR_GRAY}History is empty.{COLOR_RESET}\n")
            else:
                print(f"\n{COLOR_BANNER}--- Active Conversation History ---{COLOR_RESET}")
                for msg in messages:
                    role = msg.get("role", "unknown").capitalize()
                    content = msg.get("content", "")
                    if role == "User":
                        print(f"{COLOR_USER}User:{COLOR_RESET} {content}")
                    elif role == "Assistant":
                        print(f"{COLOR_AI}Assistant:{COLOR_RESET} {content}")
                    else:
                        print(f"{COLOR_GRAY}{role}:{COLOR_RESET} {content}")
                print(f"{COLOR_BANNER}----------------------------------{COLOR_RESET}\n")
            continue
            
        # Add to history
        messages.append({"role": "user", "content": user_input})
        
        print(f"{COLOR_AI}AI > {COLOR_RESET} ", end="", flush=True)
        
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=1,
                top_p=1,
                stream=True
            )
            
            response_text = ""
            for chunk in completion:
                if not getattr(chunk, "choices", None) or len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta
                if getattr(delta, "content", None) is not None:
                    chunk_text = delta.content
                    print(chunk_text, end="", flush=True)
                    response_text += chunk_text
                    
            print() # new line after response is finished
            
            # Save assistant response to history
            if response_text:
                messages.append({"role": "assistant", "content": response_text})
                save_history(messages)
            print()
            
        except Exception as e:
            # Revert the last user message if API failed, so it doesn't pollute history
            if messages and messages[-1]["role"] == "user":
                messages.pop()
            print(f"\n{COLOR_RED}API Error: {e}{COLOR_RESET}\n")

if __name__ == "__main__":
    main()
