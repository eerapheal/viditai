# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create storage directories for local fallback
RUN mkdir -p storage/uploads storage/output storage/thumbnails

# Expose port 8000
EXPOSE 8000

# Entrypoint will be defined in docker-compose for either API or Worker
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
