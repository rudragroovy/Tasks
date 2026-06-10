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

from token_logger import log_api_call

# Initialize Colorama
init(autoreset=True)

class ProductionBotV3:
    def __init__(self, provider: str, system_prompt: str = None):
        self.provider = provider
        self.models = {
            "openai": "openai/gpt-4o-mini",
            "gemini": "google/gemini-2.5-flash",
            "anthropic": "anthropic/claude-3-haiku"
        }
        self.model = self.models.get(provider, "openai/gpt-4o-mini")
        self.history_path = os.path.join(os.path.dirname(__file__), "history.json")
        self.messages = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})
            
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.total_cached_tokens = 0
        
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
            
        if not system_prompt:
            self.load_history()

    def count_tokens(self, text: str) -> int:
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return len(text.split())

    def load_history(self):
        if os.path.exists(self.history_path):
            try:
                with open(self.history_path, "r", encoding="utf-8") as f:
                    # Don't overwrite system prompt if we just set it
                    loaded = json.load(f)
                    if not self.messages or (loaded and loaded[0].get("role") != "system"):
                        self.messages = loaded
            except Exception as e:
                print(f"{Fore.RED}Error loading history: {e}{Style.RESET_ALL}")

    def save_history(self):
        try:
            with open(self.history_path, "w", encoding="utf-8") as f:
                json.dump(self.messages, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"{Fore.RED}Error saving history: {e}{Style.RESET_ALL}")

    def clear_history(self):
        # Keep system prompt if it exists
        if self.messages and self.messages[0].get("role") == "system":
            self.messages = [self.messages[0]]
        else:
            self.messages = []
        if os.path.exists(self.history_path):
            os.remove(self.history_path)
        print(f"{Fore.YELLOW}Chat history cleared.{Style.RESET_ALL}\n")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    async def fetch_stream(self):
        return await self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            stream=True,
            stream_options={"include_usage": True},
            max_tokens=2000
        )

    async def chat_loop(self):
        print(f"{Fore.MAGENTA}=================================================={Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}      Production Chat CLI v3 (Caching & Logging)  {Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}=================================================={Style.RESET_ALL}")
        print(f"Provider: {Fore.YELLOW}{self.provider}{Style.RESET_ALL} | Model: {Fore.YELLOW}{self.model}{Style.RESET_ALL}")
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

            self.messages.append({"role": "user", "content": user_input})
            
            print(f"{Fore.CYAN}AI > {Style.RESET_ALL}", end="", flush=True)
            
            response_text = ""
            final_usage = None
            
            try:
                stream = await self.fetch_stream()
                async for chunk in stream:
                    if chunk.usage:
                        final_usage = chunk.usage
                        
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if delta.content is not None:
                        chunk_text = delta.content
                        print(chunk_text, end="", flush=True)
                        response_text += chunk_text
                        
                print() # New line
                
                # Extract usage from stream final chunk if available
                p_tokens = 0
                c_tokens = 0
                cached = 0
                
                if final_usage:
                    p_tokens = final_usage.prompt_tokens
                    c_tokens = final_usage.completion_tokens
                    if hasattr(final_usage, "prompt_tokens_details") and final_usage.prompt_tokens_details:
                        cached = getattr(final_usage.prompt_tokens_details, "cached_tokens", 0) or 0
                else:
                    # Fallback local count
                    prompt_content = "\n".join([m["content"] for m in self.messages])
                    p_tokens = self.count_tokens(prompt_content)
                    c_tokens = self.count_tokens(response_text)
                    cached = 0
                    
                self.total_prompt_tokens += p_tokens
                self.total_completion_tokens += c_tokens
                self.total_cached_tokens += cached
                
                # Log to CSV
                log_api_call(self.model, "chat", p_tokens, cached, c_tokens)
                
                print(f"{Fore.LIGHTBLACK_EX}[Tokens - Prompt: {p_tokens} (Cached: {cached}) | Output: {c_tokens}]{Style.RESET_ALL}")
                if cached > 0:
                    print(f"{Fore.GREEN}[Prompt Caching Active! Saving costs.]{Style.RESET_ALL}\n")
                else:
                    print()
                
                self.messages.append({"role": "assistant", "content": response_text})
                self.save_history()
                
            except Exception as e:
                self.messages.pop()
                print(f"\n{Fore.RED}API Error after retries: {e}{Style.RESET_ALL}\n")

async def main():
    parser = argparse.ArgumentParser(description="Production-grade Async CLI Bot v3")
    parser.add_argument("--provider", type=str, choices=["openai", "gemini", "anthropic"], default="openai")
    args = parser.parse_args()
    bot = ProductionBotV3(provider=args.provider)
    await bot.chat_loop()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
