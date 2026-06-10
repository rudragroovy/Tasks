# Exercise 15: Candidate Screener
## Tech Stack
- Python
- SQLite (Local Database)

## What the Agent Does
This agent acts as an automated technical recruiter to screen applicants. It utilizes the OpenAI SDK (configured for OpenRouter) and is equipped with the following tool capabilities:
1. **File Reading (`read_file`)**: Reads and extracts text from the provided resume (supports both `.txt` and `.pdf`) and the job description file.
2. **Evaluation & Scoring**: Analyzes the resume against the job requirements, gives a score out of 10, and provides a detailed summary of the candidate's strengths and weaknesses.
3. **Database Storage (`save_to_db`)**: Autonomously saves the candidate's name, their final score, and the feedback directly into a local SQLite database (`candidates.db`) for record-keeping.

## How to use
1. Install requirements: `pip install -r requirements.txt`. (Ensure `PyPDF2` is installed to read PDFs).
2. Configure `.env` with your `OPENROUTER_API_KEY`.
3. Run `python candidate_screener.py` and provide the paths to the resume (e.g., `sample_resume.txt`) and `job_description.txt` when prompted.
