DOCKER_DIR=/home/vijay/docker/docker_admin
DEV_DIR=/home/vijay/timeli/admin

cd $DOCKER_DIR/admin
git pull origin master 
cd $DEV_DIR 
./node_modules/webpack/bin/webpack.js -p --config webpack.prod.config.js    
cp src/server/public/static/* $DOCKER_DIR/admin/src/server/public/static/
cd $DOCKER_DIR 
docker build -t timeli/security-admin .
