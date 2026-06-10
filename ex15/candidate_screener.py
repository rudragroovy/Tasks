import os
import json
import sqlite3
from openai import OpenAI
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

# Initialize Rich console
console = Console()

# Load environment variables
load_dotenv()

# Initialize OpenAI client for OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Use a free model
MODEL = "openai/gpt-oss-120b:free"

def read_file(filepath: str) -> str:
    """Reads a text or PDF file and returns its content."""
    try:
        if filepath.lower().endswith('.pdf'):
            import PyPDF2
            with open(filepath, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
    except ImportError:
        return "Error: PyPDF2 library is required to read PDF files. Please install it with 'pip install PyPDF2'."
    except Exception as e:
        return f"Error reading file: {e}"

def save_to_db(candidate_name: str, score: int, feedback: str) -> str:
    """Saves candidate scorecard to a SQLite database."""
    try:
        conn = sqlite3.connect('candidates.db')
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scorecards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_name TEXT,
                score INTEGER,
                feedback TEXT
            )
        ''')
        
        cursor.execute('''
            INSERT INTO scorecards (candidate_name, score, feedback)
            VALUES (?, ?, ?)
        ''', (candidate_name, score, feedback))
        
        conn.commit()
        conn.close()
        return f"Successfully saved scorecard for {candidate_name} to database."
    except Exception as e:
        return f"Error saving to database: {e}"

# Define the tools for the LLM
tools = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Reads a text or PDF file and returns its content. Use this to read resumes and job descriptions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "The path to the file."
                    }
                },
                "required": ["filepath"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_to_db",
            "description": "Saves candidate scorecard to a SQLite database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "candidate_name": {
                        "type": "string",
                        "description": "The name of the candidate."
                    },
                    "score": {
                        "type": "integer",
                        "description": "The score out of 10 given to the candidate based on the job description."
                    },
                    "feedback": {
                        "type": "string",
                        "description": "A summary of the candidate's strengths and weaknesses, and why the score was given."
                    }
                },
                "required": ["candidate_name", "score", "feedback"]
            }
        }
    }
]

def main():
    console.print("[bold cyan]Starting Candidate Screener Agent...[/bold cyan]")
    
    # Check for API key
    if not os.getenv("OPENROUTER_API_KEY"):
        console.print("[bold red]WARNING: OPENROUTER_API_KEY is not set in the environment or .env file.[/bold red]")
        console.print("[yellow]Please set it to run the agent.[/yellow]")
        return
        
    resume_path = console.input("[bold yellow]Enter the path to the candidate's resume: [/bold yellow]")
    job_description_path = console.input("[bold yellow]Enter the path to the job description: [/bold yellow]")

    # Initial system instructions
    messages = [
        {"role": "system", "content": "You are an expert technical recruiter and candidate screener. Your job is to read a candidate's resume and a job description, evaluate the candidate out of 10, and save the scorecard to the database. Use the tools provided."},
        {"role": "user", "content": f"Please screen the candidate resume located at '{resume_path}' against the job description at '{job_description_path}'. Provide a score out of 10 and save it to the database. Provide a detailed summary of your findings as your final response, formatted in Markdown."}
    ]
    
    # Step 1: Send initial request to LLM
    with console.status("[bold green]Calling LLM...[/bold green]"):
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
    
    response_message = response.choices[0].message
    messages.append(response_message)
    
    # Step 2: Handle tool calls
    while response_message.tool_calls:
        for tool_call in response_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            console.print(f"[dim]Executing Tool: {function_name}(...)[/dim]")
            
            if function_name == "read_file":
                function_response = read_file(filepath=function_args.get("filepath"))
            elif function_name == "save_to_db":
                function_response = save_to_db(
                    candidate_name=function_args.get("candidate_name"),
                    score=function_args.get("score"),
                    feedback=function_args.get("feedback")
                )
            else:
                function_response = f"Error: Unknown tool {function_name}"
                
            messages.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": str(function_response),
                }
            )
            
        # Send tool results back to LLM
        with console.status("[bold green]Sending tool results back to LLM...[/bold green]"):
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto"
            )
        response_message = response.choices[0].message
        messages.append(response_message)

    console.print("\n[bold cyan]Agent Finished.[/bold cyan]")
    if response_message.content:
        # Display final response in a nice rich panel formatted as Markdown
        md = Markdown(response_message.content)
        panel = Panel(md, title="[bold magenta]Candidate Evaluation Summary[/bold magenta]", border_style="cyan")
        console.print(panel)

if __name__ == "__main__":
    main()
