FROM  ubuntu:latest
RUN echo 'deb http://security.ubuntu.com/ubuntu trusty-security multiverse' >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y wget curl sudo
RUN wget -qO- https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install -y nodejs
RUN npm install forever -g
ADD admin  /home/ubuntu/admin
WORKDIR /home/ubuntu/admin
RUN npm install --production
ADD startup.sh /usr/bin/startup.sh
RUN chmod a+x /usr/bin/startup.sh
EXPOSE 3000
ENTRYPOINT ["/usr/bin/startup.sh"]
