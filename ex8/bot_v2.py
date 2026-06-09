import argparse
import asyncio
import json
import os
import sys

from colorama import Fore, Style, init
from dotenv import load_dotenv
from openai import AsyncOpenAI
import tiktoken
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

# Initialize Colorama
init(autoreset=True)

class ProductionBot:
    def __init__(self, provider: str):
        self.provider = provider
        self.models = {
            "openai": "openai/gpt-4o-mini",
            "gemini": "google/gemini-2.5-flash",
            "anthropic": "anthropic/claude-3-haiku"
        }
        self.model = self.models.get(provider, "openai/gpt-4o-mini")
        self.history_path = os.path.join(os.path.dirname(__file__), "history.json")
        self.messages = []
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        
        # Load env vars
        load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            print(f"{Fore.RED}Error: OPENROUTER_API_KEY not found.{Style.RESET_ALL}")
            sys.exit(1)
            
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key
        )
        
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None
            
        self.load_history()

    def count_tokens(self, text: str) -> int:
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return len(text.split()) # Naive fallback

    def load_history(self):
        if os.path.exists(self.history_path):
            try:
                with open(self.history_path, "r", encoding="utf-8") as f:
                    self.messages = json.load(f)
            except Exception as e:
                print(f"{Fore.RED}Error loading history: {e}{Style.RESET_ALL}")

    def save_history(self):
        try:
            with open(self.history_path, "w", encoding="utf-8") as f:
                json.dump(self.messages, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"{Fore.RED}Error saving history: {e}{Style.RESET_ALL}")

    def clear_history(self):
        self.messages = []
        if os.path.exists(self.history_path):
            os.remove(self.history_path)
        print(f"{Fore.YELLOW}Chat history cleared.{Style.RESET_ALL}\n")

    def print_history(self):
        if not self.messages:
            print(f"{Fore.LIGHTBLACK_EX}History is empty.{Style.RESET_ALL}\n")
            return
            
        print(f"\n{Fore.MAGENTA}--- Active Conversation History ---{Style.RESET_ALL}")
        for msg in self.messages:
            role = msg.get("role", "unknown").capitalize()
            content = msg.get("content", "")
            if role == "User":
                print(f"{Fore.GREEN}User:{Style.RESET_ALL} {content}")
            elif role == "Assistant":
                print(f"{Fore.CYAN}Assistant:{Style.RESET_ALL} {content}")
            else:
                print(f"{Fore.LIGHTBLACK_EX}{role}:{Style.RESET_ALL} {content}")
        print(f"{Fore.MAGENTA}----------------------------------{Style.RESET_ALL}\n")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    async def fetch_stream(self):
        # We wrap the API call in a retry logic block
        # Tenacity handles the exponential backoff automatically on any exception (like 429 RateLimitError)
        # Using max_tokens for safety especially with models having huge context windows on OpenRouter
        return await self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            stream=True,
            max_tokens=1000
        )

    async def chat_loop(self):
        print(f"{Fore.MAGENTA}=================================================={Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}      Production Chat CLI v2 (Streaming & Async)  {Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}=================================================={Style.RESET_ALL}")
        print(f"Provider: {Fore.YELLOW}{self.provider}{Style.RESET_ALL} | Model: {Fore.YELLOW}{self.model}{Style.RESET_ALL}")
        
        if self.messages:
            user_turns = sum(1 for m in self.messages if m.get("role") == "user")
            print(f"Loaded {Fore.YELLOW}{user_turns}{Style.RESET_ALL} previous turn(s).")
            
        print(f"Commands: {Fore.LIGHTBLACK_EX}/clear, /history, /exit{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}--------------------------------------------------{Style.RESET_ALL}\n")

        while True:
            try:
                user_input = input(f"{Fore.GREEN}You > {Style.RESET_ALL}").strip()
            except (KeyboardInterrupt, EOFError):
                print(f"\n{Fore.YELLOW}Exiting. Goodbye!{Style.RESET_ALL}")
                break
                
            if not user_input:
                continue
                
            cmd = user_input.lower()
            if cmd in ["/exit", "/quit"]:
                print(f"{Fore.YELLOW}Exiting. Goodbye!{Style.RESET_ALL}")
                break
            if cmd == "/clear":
                self.clear_history()
                continue
            if cmd == "/history":
                self.print_history()
                continue

            # Calculate prompt tokens locally for this input + history
            prompt_content = "\n".join([m["content"] for m in self.messages]) + "\n" + user_input
            p_tokens = self.count_tokens(prompt_content)
            self.total_prompt_tokens += p_tokens
                
            self.messages.append({"role": "user", "content": user_input})
            
            print(f"{Fore.CYAN}AI > {Style.RESET_ALL}", end="", flush=True)
            
            response_text = ""
            try:
                # Streaming
                stream = await self.fetch_stream()
                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if delta.content is not None:
                        chunk_text = delta.content
                        print(chunk_text, end="", flush=True)
                        response_text += chunk_text
                        
                print() # New line after stream completes
                
                # Token accounting for output
                c_tokens = self.count_tokens(response_text)
                self.total_completion_tokens += c_tokens
                
                print(f"{Fore.LIGHTBLACK_EX}[Tokens Used - Prompt: ~{p_tokens} | Completion: ~{c_tokens} | Session Total: ~{self.total_prompt_tokens + self.total_completion_tokens}]{Style.RESET_ALL}\n")
                
                self.messages.append({"role": "assistant", "content": response_text})
                self.save_history()
                
            except Exception as e:
                # Revert user message if it failed
                self.messages.pop()
                print(f"\n{Fore.RED}API Error after retries: {e}{Style.RESET_ALL}\n")

async def main():
    parser = argparse.ArgumentParser(description="Production-grade Async CLI Bot")
    parser.add_argument(
        "--provider",
        type=str,
        choices=["openai", "gemini", "anthropic"],
        default="openai",
        help="Choose the model provider"
    )
    args = parser.parse_args()
    
    bot = ProductionBot(provider=args.provider)
    await bot.chat_loop()

if __name__ == "__main__":
    # Required for some Windows environments when using asyncio with certain libraries
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
