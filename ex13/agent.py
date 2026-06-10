import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun

# ==========================================
# 1. Calculator Tools
# ==========================================
@tool
def add(a: float, b: float) -> float:
    """Add two numbers."""
    return a + b

@tool
def subtract(a: float, b: float) -> float:
    """Subtract the second number from the first."""
    return a - b

@tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b

@tool
def divide(a: float, b: float) -> float:
    """Divide the first number by the second."""
    if b == 0:
        return 0.0
    return a / b

# ==========================================
# 2. Web Search Tool
# ==========================================
# Using DuckDuckGo free search tool provided by Langchain
search_tool = DuckDuckGoSearchRun()

# ==========================================
# 3. Slack Webhook Tool
# ==========================================
@tool
def send_slack_message(message: str) -> str:
    """Sends a message to a Slack channel via Webhook. You must provide the message string."""
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return "Error: SLACK_WEBHOOK_URL environment variable not set. Inform the user."
    
    payload = {"text": message}
    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return "Message sent to Slack successfully!"
    except requests.exceptions.RequestException as e:
        return f"Failed to send message: {e}"

# ==========================================
# 4. Building the 3-Tool Agent
# ==========================================
def create_agent():
    # Retrieve the API key from environment
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENROUTER_API_KEY is missing! "
            "Please set it in your terminal using:\n"
            '$env:OPENROUTER_API_KEY="your_api_key_here"'
        )
        
    # Initialize the LLM using OpenRouter
    llm = ChatOpenAI(
        model="openrouter/free", # Using auto or you can specify a specific openrouter free model
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        temperature=0
    )
    
    # Combine all tools: Calculator + Search + Slack
    tools = [add, subtract, multiply, divide, search_tool, send_slack_message]
    
    # Initialize a memory checkpointer to persist chat history
    memory = MemorySaver()
    
    # Create the tool-calling agent using langgraph
    agent_executor = create_react_agent(llm, tools, checkpointer=memory)
    
    return agent_executor

if __name__ == "__main__":
    # Create the agent
    agent_executor = create_agent()
    
    print("🤖 Agent is ready! Type 'exit' to quit.")
    print("Make sure to set OPENROUTER_API_KEY and SLACK_WEBHOOK_URL environment variables.\n")
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['exit', 'quit']:
                break
            if not user_input.strip():
                continue
                
            # Define a configuration to track the specific conversation thread
            config = {"configurable": {"thread_id": "chat_session_1"}}
                
            # Run the agent with memory context
            response = agent_executor.invoke(
                {"messages": [("user", user_input)]}, 
                config=config
            )
            
            # The last message in the list contains the final output
            print(f"\nAgent: {response['messages'][-1].content}\n")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}\n")
