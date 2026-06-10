import os
from dotenv import load_dotenv
from llama_index.llms.openai_like import OpenAILike
from llama_index.core.agent import ReActAgent
from llama_index.core.tools import FunctionTool
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.llms import ChatMessage, MessageRole
from sqlite_memory import SQLiteMemory

load_dotenv()

# We will use OpenRouter with LlamaIndex's OpenAILike class
llm = OpenAILike(
    model=os.environ.get("OPENROUTER_DEFAULT_MODEL"),
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy_key"),
    api_base="https://openrouter.ai/api/v1",
    is_chat_model=True
)

def calculate_sum(a: int, b: int) -> int:
    """Calculates the sum of two integers."""
    return a + b

sum_tool = FunctionTool.from_defaults(fn=calculate_sum)

# Initialize our custom SQLite memory for long-term storage
db_memory = SQLiteMemory()
session_id = "llamaindex_session"

def run_agent(user_input: str):
    # 1. Retrieve long-term memory to populate short-term memory
    history_records = db_memory.get_messages(session_id)
    chat_history = []
    for msg in history_records:
        role = MessageRole.USER if msg["role"] == "user" else MessageRole.ASSISTANT
        chat_history.append(ChatMessage(role=role, content=msg["content"]))
    
    # We use ChatMemoryBuffer as short-term memory loaded from long-term
    memory = ChatMemoryBuffer.from_defaults(chat_history=chat_history)

    # 2. Initialize and run agent
    import asyncio
    async def _run():
        agent = ReActAgent(
            tools=[sum_tool], 
            llm=llm, 
            verbose=False, 
            system_prompt="You are a helpful assistant. Do not use LaTeX formatting for math. Use plain text only."
        )
        return await agent.run(user_msg=user_input, memory=memory)
        
    response = asyncio.run(_run())
    output = str(response.response.content) if hasattr(response, 'response') else str(response)

    # 3. Save to long-term memory
    db_memory.add_message(session_id, "user", user_input)
    db_memory.add_message(session_id, "assistant", output)

    return output

if __name__ == "__main__":
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel

    console = Console()
    console.print(Panel("[bold blue]LlamaIndex Agent Initialized[/bold blue]\nType 'quit' to exit.", title="System", border_style="blue"))
    
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
