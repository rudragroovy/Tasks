import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from sqlite_memory import SQLiteMemory

load_dotenv()

# We use OpenRouter
llm = ChatOpenAI(
    model=os.environ.get("OPENROUTER_DEFAULT_MODEL"),
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy_key"),
    base_url="https://openrouter.ai/api/v1",
)

@tool
def calculate_sum(a: int, b: int) -> int:
    """Calculates the sum of two integers."""
    return a + b

tools = [calculate_sum]

agent = create_agent(llm, tools=tools)

# Initialize our custom SQLite memory for long-term storage
db_memory = SQLiteMemory()
session_id = "langchain_session"

def run_agent(user_input: str):
    # 1. Retrieve long-term memory
    history_records = db_memory.get_messages(session_id)
    chat_history = [SystemMessage(content="You are a helpful assistant. Do not use LaTeX formatting for math. Use plain text only.")]
    for msg in history_records:
        if msg["role"] == "user":
            chat_history.append(HumanMessage(content=msg["content"]))
        else:
            chat_history.append(AIMessage(content=msg["content"]))

    chat_history.append(HumanMessage(content=user_input))

    # 2. Run agent
    res = agent.invoke({"messages": chat_history})
    # The result contains the updated messages list
    output_message = res["messages"][-1].content
    if not output_message and hasattr(res["messages"][-1], "tool_calls") and res["messages"][-1].tool_calls:
        output_message = f"Used tool: {res['messages'][-1].tool_calls[0]['name']}"

    # 3. Save to long-term memory
    db_memory.add_message(session_id, "user", user_input)
    db_memory.add_message(session_id, "assistant", output_message)

    return output_message

if __name__ == "__main__":
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel

    console = Console()
    console.print(Panel("[bold green]LangChain Agent Initialized[/bold green]\nType 'quit' to exit.", title="System", border_style="green"))
    
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
