#FROM python:3.10
FROM python:3.9-slim-bullseye 
# <-- 당신의 실제 FROM 이미지로 변경하세요

RUN apt-get update && \
    apt-get install -y openjdk-17-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# (선택 사항) JAVA_HOME 환경 변수 설정 - 대부분의 경우 필요 없지만, 명시적으로 설정하면 좋습니다.
# 정확한 경로는 설치되는 Java 버전에 따라 다를 수 있습니다.
ENV JAVA_HOME /usr/lib/jvm/java-17-openjdk-amd64
ENV PATH $PATH:$JAVA_HOME/bin
#RUN apt -y update; apt -y upgrade; apt -y install vim git net-tools

WORKDIR /root

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "test:app", "--host", "0.0.0.0", "--port", "8080"]