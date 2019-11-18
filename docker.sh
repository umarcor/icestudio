#!/usr/bin/env sh

set -e

cd $(dirname $0)

ENABLE_BUILDKIT=1

build_dev() {
  docker build -t umarcor/hwstudio:i-dev - <<EOF
FROM python:3.7
RUN \
  curl -sL https://deb.nodesource.com/setup_11.x | bash - &&\
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - &&\
  echo 'deb https://dl.yarnpkg.com/debian/ stable main' | tee /etc/apt/sources.list.d/yarn.list &&\
  apt update -qq &&\
  apt install -y nodejs yarn &&\
  sed -i 's/TLSv1.2/TLSv1.0/g' /etc/ssl/openssl.cnf
EOF
}

build_run() {
  docker build -t umarcor/hwstudio:i-run - <<EOF
FROM python:3.7
RUN apt update -qq &&\
  apt install -y \
    libasound2 \
    libgconf-2-4 \
    libgl1-mesa-dri \
    libgl1-mesa-glx \
    libgtk2.0-0 \
    libnotify4 \
    libnss3 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6
EOF
}

#libglib2.0-0 \
#libfontconfig \
#libpangocairo-1.0-0 \

exec_runx() {
  PATH=$PATH:/t/runx/ /t/x11docker/x11docker --runx --no-auth -i --user=root -- -v "$1":/src -- umarcor/hwstudio:i-run $2
}

case "$1" in
  --build|-b)
    shift
    case "$1" in
      dev) build_dev;;
      run) build_run;;
      *)
        echo "Unknown build arg $1"
        exit 1
    esac
    ;;
  --interactive|-i)
    shift
    echo "Run interactive umarcor/hwstudio:i-run"
    exec_runx "$(pwd -W)" bash
    ;;
  --dist|-d)
    shift
    echo "Build Icestudio in umarcor/hwstudio:i-dev"
    docker run --rm -v $(pwd -W):/src -w /src -e DIST_TARGET=lin64 umarcor/hwstudio:i-dev bash -c "yarn && yarn grunt dist -v"

    echo "Build umarcor/hwstudio:icestudio.v1"
    cd dist
    VERSION="`ls icestudio-*-linux64.zip | sed 's#.*-\([0-9\.]*\)-.*#\1#g'`"
    docker build -t umarcor/hwstudio:icestudio.v1 . -<<EOF
FROM umarcor/hwstudio:i-run
ADD /"icestudio-$VERSION-linux64.zip" /tmp
#RUN chmod +x "/tmp/icestudio-$VERSION-linux64/icestudio"
EOF
    cd ..
    ;;
  --test|-t)
    cd dist
    VERSION="`ls hwstudio-*-linux64.zip | sed 's#.*-\([0-9\.]*\)-.*#\1#g'`"
    echo "VERSION: $VERSION"
    unzip "hwstudio-$VERSION-linux64.zip"
    chmod +x "hwstudio-$VERSION-linux64/hwstudio"

    shift
    exec_runx "$(pwd -W)/icestudio-$VERSION-linux64" $1
    ;;
  --publish|-p)
    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
    docker images
    docker push umarcor/hwstudio
    docker logout
    ;;
esac
