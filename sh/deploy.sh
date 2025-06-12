#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use node

if [ -d /work/actio ]; then
  cd /work/actio
else
  echo "/work/actio 폴더가 존재하지 않습니다!"
  exit 1
fi

git pull

SRC=/work/actio/nodejs/hello
DEST=/$HOME/deploy

rm -rf $DEST
mkdir -p $DEST
cp -rf $SRC $DEST

cd $DEST/hello

source ~/.bashrc

npm install

pm2 restart all

echo "실행 중인 deploy.sh 경로: $0"
echo "현재 디렉토리: $(pwd)"