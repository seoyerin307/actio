FROM python:3.10

RUN apt -y update; apt -y upgrade; apt -y install vim git net-tools

WORKDIR /root

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "sum:app", "--host", "0.0.0.0", "--port", "8080"]