FROM python:3.11

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

EXPOSE 8000

# Final CMD to start the server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
