FROM python:3.12-slim

WORKDIR /app

# Install poetry
RUN pip install poetry

# Disable virtual environment creation so packages install globally
RUN poetry config virtualenvs.create false

# Copy dependency files and install
COPY pyproject.toml poetry.lock ./ 
RUN poetry install --without dev

# Copy the rest of the application
COPY . .

# Set correct entry point
ENTRYPOINT ["python", "-m", "app.cli.main"]
CMD ["--help"]
