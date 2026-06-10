import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from sqlite_memory import SQLiteMemory

load_dotenv()

# We use the pure OpenAI SDK pointing to OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy_key"),
)

def calculate_sum(a: int, b: int) -> int:
    """Calculates the sum of two integers."""
    return a + b

# Define the tool for the API
tools = [
    {
        "type": "function",
        "function": {
            "name": "calculate_sum",
            "description": "Calculates the sum of two integers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {
                        "type": "integer",
                        "description": "The first integer."
                    },
                    "b": {
                        "type": "integer",
                        "description": "The second integer."
                    }
                },
                "required": ["a", "b"]
            }
        }
    }
]

db_memory = SQLiteMemory()
session_id = "pure_sdk_session"

def run_agent(user_input: str):
    # 1. Retrieve history
    history_records = db_memory.get_messages(session_id)
    messages = [{"role": "system", "content": "You are a helpful assistant with a calculator tool. Do not use LaTeX formatting for math. Use plain text only."}]
    
    for msg in history_records:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": user_input})

    # 2. Agent loop
    while True:
        response = client.chat.completions.create(
            model=os.environ.get("OPENROUTER_DEFAULT_MODEL"),
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        
        if response_message.tool_calls:
            messages.append(response_message)
            for tool_call in response_message.tool_calls:
                if tool_call.function.name == "calculate_sum":
                    args = json.loads(tool_call.function.arguments)
                    print(f"Executing tool calculate_sum with {args}")
                    result = calculate_sum(args["a"], args["b"])
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "calculate_sum",
                        "content": str(result)
                    })
        else:
            output = response_message.content
            break

    # 3. Save to long-term memory
    db_memory.add_message(session_id, "user", user_input)
    db_memory.add_message(session_id, "assistant", output)

    return output

if __name__ == "__main__":
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel

    console = Console()
    console.print(Panel("[bold yellow]Pure SDK Agent Initialized[/bold yellow]\nType 'quit' to exit.", title="System", border_style="yellow"))
    
    while True:
        user_input = console.input("\n[bold cyan]You:[/bold cyan] ")
        if user_input.lower() in ["quit", "exit"]:
            break
        try:
            response = run_agent(user_input)
            import re
            response = re.sub(r'\*\*(.*?)\*\*', r'[bold]\1[/bold]', response)
            console.print("\n[bold magenta]Agent:[/bold magenta]")
            console.print(Panel(response, border_style="magenta"))
        except Exception as e:
            import traceback
            traceback.print_exc()
            console.print(f"[bold red]Error:[/bold red] {e}")
