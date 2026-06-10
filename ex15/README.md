# Candidate Screener Agent

This is a custom AI agent that automates the initial screening of candidate resumes against a job description. It solves a real operations pain point for hiring managers by filtering through resumes and providing a scorecard for each candidate.

## Architecture
- **LLM**: OpenRouter (free models).
- **Tools**:
  - `read_file`: Reads candidate resumes (supports both `.txt` and `.pdf` formats) and job descriptions.
  - `save_to_db`: Saves the candidate scorecard and LLM feedback to a local SQLite database (`candidates.db`).

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Create a `.env` file and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```

## Usage
Run the agent:
```bash
python candidate_screener.py
```

Upon running, the script will interactively prompt you for:
1. **Resume Path**: The file path to the candidate's resume (e.g., `sample_resume.txt` or `resume.pdf`).
2. **Job Description Path**: The file path to the job description (e.g., `job_description.txt`).

### Example Interaction

```text
$ python candidate_screener.py
Starting Candidate Screener Agent...
Enter the path to the candidate's resume: sample_resume.txt
Enter the path to the job description: job_description.txt

[LLM Processing & Tool Execution...]

Agent Finished.
[Candidate Evaluation Summary is displayed]
```

The agent will evaluate the candidate, display a detailed Markdown summary in the console, and log the scorecard directly to the database.
