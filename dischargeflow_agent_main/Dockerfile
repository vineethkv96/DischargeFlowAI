FROM python:3.11

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

EXPOSE 9000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "9000"]