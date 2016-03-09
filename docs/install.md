# 서버 운용법과 개발설명서

본 문서는 docker를 기반으로 하는 CI 플랫폼을 일반 서버 또는 VM에 구축하고 운용하기 위한 가이드입니다. 
본 문서는 Gitlab, Docker Cluster 및 Sonarqube 설치와 구성에 대한 내용을 포함하고 있습니다.

# 설치
본 문서의 목표는 서버 운용자로 하여금 Gitlab 프로젝트의 빌드와 코드분석 실행시 Docker Cluster 를 활용하여 유저의 프로젝트마다 독립적인 OS 빌드환경과 소스코드 분석 서비스를 제공하고, 소모되는 리소스를 Docker Cluster 환경에 분산배치 하는 것입니다.

이를 구축하기 위해서 다음의 순서로 설치를 진행하시기 바랍니다.
본 문서와 관련하여 참고할 수 있는 리소스는 다음과 같습니다.
 * [Docker](https://www.docker.com/)
 * [Docker shipyard](https://shipyard-project.com/)
 * [Gitlab](https://about.gitlab.com/)
 * [Sonarqube](http://www.sonarqube.org/)
 * [Amazon EC2](https://aws.amazon.com/ko/ec2/)


### 목차
 - [서버 준비사항](#서버-준비사항)
    - [Docker Manager Server](#docker-manager-server)
    - [Docker Agent](#docker-agent)
    - [Docker Registry](#docker-registry)
    - [Gitlab Server](#gitlab-server)
    - [Runner Server](#runner-server)
    - [SonarQube Server](#sonarqube-server)

 - [공통 사항](#공통-사항)
    - [sudo 계정 준비](#sudo-계정-준비)
    - [ssh 패스워드 허용](#ssh-패스워드-허용)
    - [호스트 네임 변경](#호스트-네임-변경)
    - [디스크 마운트](#디스크-마운트)
    - [시스템 재부팅](#시스템-재부팅)

 - [Docker Registry Server Install](#docker-registry-server-install)
 - [Docker Agent Server Install](#docker-agent-server-install)
 - [Docker Manager Server Install](#docker-manager-server-install)
 - [SonarQube Server Install](#sonarqube-server-install)
 - [Gitlab Server Install](#gitlab-server-install)
 - [Runner Server install](#runner-server-install)
    - [docker install](#docker-install)
    - [gitlab-ci-multi-runner install](#gitlab-ci-multi-runner-install)
    - [gitlab-sonar-multi-runner](#gitlab-sonar-multi-runner-install)


### 서버 준비사항
CI 플랫폼을 구성하기 위해서 필요한 최소한의 요구사항은 다음과 같습니다.
모든 서버에 공통적으로 Intel 2.0GHz 2 core , 2GB memory, 100GB 디스크 용량이상이 필요합니다.

##### Docker Manager Server

 - 서버 수 : 1개
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22, 80, 8080, 2375, 3375, 8400, 8500,ALL ICMP
 - 공용 아이피 : 1개
 - FQDN 도메인 : master.baikal.io

##### Docker Agent

 - 서버 수 : 3개 이상
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22, 80, 2375, 8400, 8500,ALL ICMP

##### Docker Registry

 - 서버 수 : 1개
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22, 80, 2375, 5000,ALL ICMP

##### Gitlab Server

 - 서버 수 : 1개
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22,80,443,5432,ALL ICMP
 - 공용 아이피 : 1개
 - FQDN 도메인 : git.baikal.io

##### Runner Server
러너 서버는 gitlab-ci-multi-runner, gitlab-sonar-multi-runner 두가지를 같은 곳에 설치하게 됩니다.

 - 서버 수 : 1개
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22,80,9010,ALL ICMP
 - 공용 아이피 : 1개

##### SonarQube Server

 - 서버 수 : 1개
 - OS Version  : Ubuntu 14.04 64bit
 - 포트개방 : 22,80,443,3306,9100,ALL ICMP
 - 공용 아이피 : 1개

위의 준비사항 중 FQDN과 공용아이피 설정사항을 주의깊게 살펴보시길 바랍니다.
Docker Manager Server 와 Gitlab 서버는 FQDN 형식의 실제 도메인 주소가 필요합니다.
Runner 서버와 SonarQube 서버는 도메인 주소는 필요없지만 공용아이피가 한개 필요합니다.
Docker Agent, Docker Registry 서버는 공용아이피는 필요없지만, Docker Manager 서버가 접근할 수 있도록 네트워크 구성이 되어있어야 합니다.

아래 서버 준비 사항들 중 FQDN 도메인은 예시이며, 서버환경에 따라 다르게 세팅할 수 있습니다. 단, FQDN 도메인과 해당 서버의 호스트네임은 설정은 동일해야 합니다. 

### 공통 사항

공통사항은 모든 서버에 대하여 수행해야 하는 과정입니다.
이 과정을 주의깊게 읽고 누락되는 사항없이 실행하도록 합니다.

##### sudo 계정 준비
1) 서버별로 다음의 sudo 계정을 준비합니다.

 - Docker Manager : docker
 - Docker Agent : docker
 - Docker Registry : docker
 - Gitlab Server : git
 - Runner Server : docker
 - SonarQube Server : sonar

2) 계정을 생성합니다.
```sh
$ sudo adduser docker
Adding user `docker' ...
Adding new group `docker' (1004) ...
Adding new user `docker' (1004) with group `docker' ...
Creating home directory `/home/docker' ...
Copying files from `/etc/skel' ...
Enter new UNIX password: 
Retype new UNIX password: 
.
.
```
3) sudoers 파일을 수정합니다.
```sh
$ sudo chmod u+w /etc/sudoers
$ sudo vi /etc/sudoers
.
.
docker ALL=(ALL) NOPASSWD: ALL  => 라인 추가
.
.
$ sudo chmod u-w /etc/sudoers
```
##### ssh 패스워드 허용
경우에 따라 Runner 서버와 Docker 서버들이 패스워드 기반 ssh 통신을 해야 할 경우가 있습니다. 따라서 1.sudo 계정 준비 에서 생성한 계정들이 패스워드 로그인이 가능하도록 다음을 수정해줍니다.
```sh
$ sudo vi /etc/ssh/sshd_config
.
PasswordAuthentication no  ==>  yes 로 수정합니다.
.
$ sudo service ssh restart
```

##### 호스트 네임 변경
1) 서버별로 다음의 호스트네임을 적용합니다. 아래 호스트네임은 예로 든 것이며, 운영환경에 따라 다르게 세팅할 수 있습니다.

 - Docker Manager : master.baikal.io
 - Docker Registry : registry.baikal.io
 - Gitlab Server : git.baikal.io
 - Runner Server : runner.baikal.io
 - SonarQube Server : sonar.baikal.io
 - Docker Agent : 도커 에이전트 서버들은 다수로 구성되며, 개수 제한이 없습니다. 순서대로 node1.baikal.io, node2.baikal.io 식으로 설정하도록 합니다.

2) 위에서 예시한 호스트네임을 적용합니다.
```sh
$ sudo vi /etc/hostname
.
<new host name>  => 기존에 라인이 있다면 모두 지우고 새 호스트이름을 씁니다.

예제:
master.baikal.io
.
.
$ sudo hostname -F /etc/hostname
```

##### 디스크 마운트
OS 가 이미 충분한 양의 디스크에서 운용이 되고있다면 이 단계는 넘어가도 됩니다. 하지만 100GB 이하의 디스크 볼륨에서 OS 가 운용되고있거나, 장기적인 운용을 생각한다면 각 서버의 데이터 디렉토리에 대해 별도의 볼륨 디스크를 활용하시길 권장합니다.

볼륨 디스크를 추가하는 방법은 EC2 의 경우 다음 리소스를 참조합니다.
 - [EC2 인스턴스에 볼륨 추가](http://docs.aws.amazon.com/ko_kr/AWSEC2/latest/UserGuide/ec2-add-volume-to-instance.html)

1) 모든 서버에 100GB 이상의 볼륨을 생성했다고 가정합니다.
   생성한 볼륨을 서버별로 다음의 디렉토리에 마운트를 수행하여야 합니다.
   
 - Docker Manager : /var/lib/docker
 - Docker Agent : /var/lib/docker
 - Docker Registry : /mnt
 - Gitlab Server : /mnt
 - Runner Server : /var/lib/docker

2) 다음 명령어로 마운트를 수행할 수 있습니다.
```sh
$ sudo lsblk
.
.
NAME    MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
xvda    202:0    0     8G  0 disk 
└─xvda1 202:1    0     8G  0 part /
xvdf    202:80   0   100G  0 disk
.
.
마지막의 xvdf 볼륨이 100G 인 것을 확인할 수 있습니다.
해당 볼륨을 ext4 로 포맷합니다.

$ sudo file -s /dev/xvdf
$ sudo mkfs -t ext4 /dev/xvdf
.
.
Done
.
.

1) 에서 정의한 마운트포인트로 마운트합니다.
$ sudo mount /dev/xvdf <mount point>

예시:
$ sudo mount /dev/xvdf /var/lib/docker

df 명령어를 통해 마운트 된 사항을 볼 수 있습니다.
$ sudo df
.
.
Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/xvda1       8115168 2189708   5490184  29% /
none                   4       0         4   0% /sys/fs/cgroup
udev             2009928      12   2009916   1% /dev
tmpfs             404688     404    404284   1% /run
none                5120       0      5120   0% /run/lock
none             2023436     316   2023120   1% /run/shm
none              102400       0    102400   0% /run/user
/dev/xvdf      103081248  448452  97373532   1% /var/lib/docker
.
.
```

3) 해당 마운트를 시스템 부팅때 자동으로 수행하도록 설정합니다.
```sh
/etc/fstab 파일을 백업합니다.
$ sudo cp /etc/fstab /etc/fstab.orig

$ sudo vi /etc/fstab
.
.
/dev/xvdf <mount point> ext4 defaults,nofail 0 2
 ⇒ 해당 라인을 추가합니다.
.
.
$ sudo mount -a 
```

##### 시스템 재부팅
시스템을 재부팅하여 변경사항들이 모두 반영되는지 확인해봅니다.


### Docker Registry Server Install

Docker Registry 서버는 CI 와 Sonar 운용에 사용되는 Docker 이미지의 저장소입니다.
본 문서는 Docker Registry 2.0 버젼을 사용하고 있습니다.
Docker Registry 2.0 에 대한 리소스는 [이곳](https://docs.docker.com/registry/) 에서 찾으실 수 있습니다.

1) Docker를 인스톨합니다
```sh
$ sudo apt-get update
$ sudo apt-get install curl
$ curl -sSL https://get.docker.com/ | sh
```

2) Local 저장소를 활용하여 레지스트리 서버 활성화
본 문서의 디스크 마운트 파트에서 Docker registry 서버는 /mnt 디렉토리에 마운트를 하였습니다.
해당 디렉토리를 이미지 저장소로 지정하며 서버를 활성화합니다.
```sh
$ sudo docker run -d -p 5000:5000 -e REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/var/lib/registry -v /mnt:/var/lib/registry --restart=always --name registry registry:2
```

3) Amazon S3 저장소를 활용하여 레지스트리 서버 활성화
S3 저장소에 접근할 수 있는 accesskey, secretkey, 그리고 계정의 S3 저장소에 Docker 이미지 저장소로 쓸 디렉토리를 생성합니다. 디렉토리 이름은 자유롭게 만들면 됩니다.
다음의 명령어를 통해 서버를 활성화 합니다.
```sh
$ cd
$ vi config.yml

version: 0.1
log:
  fields:
    service: registry
storage:
  s3:
    accesskey: <아마존 계정 accesskey>
    secretkey: <아마존 계정 secretkey>
    region: ap-northeast-1
    bucket: baikal-docker-registry
    encrypt: true
    secure: true
    v4auth: true
    chunksize: 5242880
    rootdirectory: /registry
http:
    addr: :5000
    headers:
        X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3


작성한 config.yml 을 이용하여 서버를 활성화합니다.

$ sudo docker run -d -p 5000:5000 --restart=always --name registry -v `pwd`/config.yml:/etc/docker/registry/config.yml registry:2

```

### Docker Agent Server Install

도커 에이전트 서버는 실제 빌드, 코드분석을 수행하는 서버입니다.
도커 에이전트 수가 많아질수록 전체 클러스터의 수행능력이 증가 할 것입니다.
EC2 환경에서 운용 할 경우 Amazon Watch , Scale in, out 기능을 통해서 실시간으로 도커 에이전트 서버를 확장, 축소 할 수 있습니다.
본 문서에서는 다음 버전이 이것에 대해 다룰 예정입니다.
현재 버전에서는 수동으로 도커 에이전트 서버를 확장하는 법을 기술합니다.

1) Docker를 인스톨합니다
```sh
$ sudo apt-get update
$ sudo apt-get install curl
$ curl -sSL https://get.docker.com/ | sh
```

2) Registry 이미지 저장소를 설정합니다.
Docker registry 서버를 이미지 저장소로 지정합니다.

```sh
$ sudo echo 'DOCKER_OPTS="--insecure-registry <registry server host>:5000 "' | sudo tee -a /etc/default/docker

예제:
$ sudo echo 'DOCKER_OPTS="--insecure-registry 172.31.27.251:5000 "' | sudo tee -a /etc/default/docker

.
.

$ sudo service docker restart
```

3) Tcp 데몬을 실행합니다.
Docker Manager 서버는 Tcp 통신을 통해 Agent 로 명령을 수행합니다.
Agent 에서 Tcp 데몬이 실행중이어야 합니다.

```sh
$ sudo docker daemon -H=tcp://0.0.0.0:2375 --insecure-registry <registry server host>:5000 &

예제:
$ sudo docker daemon -H=tcp://0.0.0.0:2375 --insecure-registry 172.31.27.251:5000 &
```

4) 다음 챕터의 Docker Manager Server Install 을 통하여 Manager 서버에 Agent 등록 단계까지 마무리하도록 합니다.


### Docker Manager Server Install

Docker Manager 서버는 Runner 서버로부터 빌드, 코드 분석 요청을 받아들여서 에이전트들에게 분산수행을 하게 해주는 마스터 역할의 서버입니다.

본 문서에서는 Docker Manager가 관리하고 있는 에이전트 서버들의 리소스 사용현황을 모니터링하기 위해 [Shipyard](https://shipyard-project.com/)  를 추가로 설치합니다.

1) Docker를 인스톨합니다
```sh
$ sudo apt-get update
$ sudo apt-get install curl
$ curl -sSL https://get.docker.com/ | sh

$ sudo usermod -aG docker ubuntu
```

2) Registry 이미지 저장소를 설정합니다.
Docker registry 서버를 이미지 저장소로 지정합니다.

```sh
$ sudo echo 'DOCKER_OPTS="--insecure-registry <registry server host>:5000 "' | sudo tee -a /etc/default/docker

예제:
$ sudo echo 'DOCKER_OPTS="--insecure-registry 172.31.27.251:5000 "' | sudo tee -a /etc/default/docker

.
.

$ sudo service docker restart
```

3) rethinkdb 를 실행합니다.
```sh
$ sudo docker run \
    -ti \
    -d \
    --restart=always \
    --name baikal-rethinkdb \
    rethinkdb
```
4) consul discovery 를 실행합니다.
consul discovery 는 등록된 Docker Agent 의 상태를 모니터링합니다.
Docker Agent 하나가 셧다운 될 경우, consul 은 셧다운된 Agent 를 매니저 서버에 알려줍니다.
Docker Agent 가 다시 부팅될 경우, consul 은 역시 Agent 를 매니저 서버에 재연결시켜줍니다.

```sh
$ sudo docker run \
    -ti \
    -d \
    -p 8400:8400 \
    -p 8500:8500 \
    --restart=always \
    --name baikal-discovery \
    progrium/consul -bootstrap -server
```

5) Docker 프록시 중계서버를 실행합니다.
```sh
$ sudo docker run \
    -ti \
    -d \
    --hostname=$HOSTNAME \
    --restart=always \
    --name baikal-proxy \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e PORT=2375 \
    ehazlett/docker-proxy:latest
```

6) Docker Manager 를 실행합니다.
이때 consul discovery 서비스를 연결하도록 설정합니다.
이때 주의해야 할 것은 consul  서비스가 localhost 에서 떠있지만 localhost 로 설정하면 실행되지 않습니다.
localhost 를 대체할 수 있는 아이피 주소로 설정하도록 합니다.

```sh
$ sudo docker run \
    -ti \
    -d \
    --restart=always \
    --name baikal-swarm-manager \
    -p 3375:3375 \
    swarm:latest \
    manage --host tcp://0.0.0.0:3375 consul://<consul service ip>:8500

예제:
$ sudo docker run \
    -ti \
    -d \
    --restart=always \
    --name baikal-swarm-manager \
    -p 3375:3375 \
    swarm:latest \
    manage --host tcp://0.0.0.0:3375 consul://172.31.26.45:8500
```

7) 앞서 생성하였던 Agent 서버들을 등록합니다.
    생성한 Agent 만큼 반복수행하도록 합니다.
    --name 은 Agent 마다 별도의 이름으로 설정하셔야 합니다.

```sh
예제:
$ sudo docker run \
    -ti \
    -d \
    --restart=always \
    --name baikal-swarm-agent1 \
    swarm:latest \
    join --addr <agent ip>:2375 consul://<consul service ip>:8500
```


8) shipyard ui 를 실행합니다.

```sh
docker run \
    -ti \
    -d \
    --restart=always \
    --name baikal-controller \
    --link baikal-rethinkdb:rethinkdb \
    --link baikal-swarm-manager:swarm \
    -p 8080:8080 \
    shipyard/shipyard:latest \
    server \
    -d tcp://swarm:3375
```

9) shipyard 접속
http://[Manager-Server-ip]:8080 으로 접속해봅니다.
초기로그인은 admin / shipyard 입니다.

NODES 탭을 클릭하여 에이전트 노드들이 모두 등록되어있는지 확인합니다.


### SonarQube Server Install

소나큐브 서버는 소스코드분석을 시도할 때, 분석된 정보들이 저장되고, UI 를 통해 보여주는 역할을 합니다.
소나큐브 서버 자체가 소스코드분석을 하지는 않습니다.
따라서 리소스 사용량이 크지 않으므로 한개의 서버로 운영해도 충분합니다.

소스코드분석을 수행하는 것은 소나큐브러너 라고 불리우는데, 앞서 설치한 Docker cluster 에서 실행되게 됩니다.


1) Mysql 설치 및 외부접속 허용 설정
```sh
$ sudo apt-get install mysql-server
$ sudo vi /etc/mysql/my.cnf
.
.
#bind-address            = 127.0.0.1
⇒ 주석처리 합니다.
.
.

$ sudo service mysql restart
$ mysql -uroot

mysql> CREATE DATABASE sonar CHARACTER SET UTF8 COLLATE UTF8_GENERAL_CI;

mysql> CREATE USER 'sonar'@'localhost' IDENTIFIED BY 'sonar';

mysql> GRANT ALL PRIVILEGES ON *.* TO 'sonar'@'localhost' identified by 'sonar';

mysql> FLUSH PRIVILEGES;

mysql> INSERT INTO mysql.user (host,USER,password) VALUES ('%','sonar',password('sonar')); GRANT ALL PRIVILEGES ON *.* TO 'sonar'@'%';

mysql> FLUSH PRIVILEGES;
```

2) Mysql 데이터베이스 마운트포지션 변경

소스코드 분석시 통상 소스코드 용량보다 더 큰 데이터베이스 용량이 필요합니다. 
안정적인 초기운영을 위해서는 msyql 데이터디렉토리를 용량이 큰 디스크에 설정하도록 합니다.

```sh
볼륨 디스크를 준비합니다.

$ sudo mv /var/lib/mysql /var/lib/mysql.backup
$ sudo mkdir /var/lib/mysql
$ sudo chown mysql:mysql /var/lib/mysql

/etc/fstab 파일을 백업합니다.
$ sudo cp /etc/fstab /etc/fstab.orig

$ sudo vi /etc/fstab
.
.
/dev/xvdf /var/lib/mysql ext4 defaults,nofail 0 2
 ⇒ 해당 라인을 추가합니다.
.
.
$ sudo mount -a 


Mysql 데이터를 새로 마운트 된 디스크로 복사합니다.

$ sudo cp -rp /var/lib/mysql.backup/* /var/lib/mysql/

```

3) SonarQube 패키지를 설치합니다.

```sh
$ sudo vi /etc/apt/sources.list
.
.
deb http://downloads.sourceforge.net/project/sonar-pkg/deb binary/
⇒ 라인을 추가합니다.
.
.
$ sudo apt-get update
$ sudo apt-get install sonar
```

4) SonarQube 환경설정
```sh
sonar.properties 파일을 열어 아래 나열된 항목들의 주석을 해제하고, 값을 입력합니다.
$ sudo vi /opt/sonar/conf/sonar.properties
.
.
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar

sonar.jdbc.url=jdbc:mysql://localhost:3306/sonar?useUnicode=true&characterEncoding=utf8&rewriteBatchedStatements=true&useConfigs=maxPerformance

sonar.web.host=0.0.0.0
sonar.web.context=

sonar.web.port=9100
.
.
$ sudo service sonar restart

```

5) SonarQube 플러그인 설치

localhost:9100 으로 접속합니다.
초기 아이디,패스워드는 admin / admin 입니다.
환경설정 => 시스템 => 업데이트 센터에서 다음 플러그인들을 설치합니다.

 - JSON [JSON]	1.1	
 - Sonargraph [Sonargraph]
 - C# [csharp]	4.2	
 - CSS [css]	1.5	
 - Erlang [erlang]	1.1	
 - Flex [flex]	2.2	
 - Groovy [groovy]	1.2	
 - Java [java]	3.0	
 - Java Properties [javaProperties]	1.3
 - JavaScript [javascript]	2.8	
 - Korean Pack [l10nko]	1.0	
 - Motion Chart [motionchart]	1.7	
 - PHP [php]	2.6	
 - Python [python]	1.5
 - Git [scmgit]	1.0	
 - SVN [scmsvn]	1.0	
 - Timeline [timeline]	1.5	
 - Web [web]	2.4	
 - XML [xml]	1.3

### Gitlab Server Install

본 문서에서는 [gitlab omnibus 패키지](https://github.com/gitlabhq/omnibus-gitlab) 를 사용한 설치방법을 설명합니다.

1) postgresql 설치 및 원격접속 허용
```sh
# Install the database packages
sudo apt-get install -y postgresql postgresql-client libpq-dev

# Login to PostgreSQL
sudo -u postgres psql -d template1

# Create a user for GitLab
# Do not type the 'template1=#', this is part of the prompt
template1=# CREATE USER git CREATEDB WITH PASSWORD 'qkfka3000';

# Create the GitLab production database & grant all privileges on database
template1=# CREATE DATABASE gitlabhq_production OWNER git;

# Quit the database session
template1=# \q

# Try connecting to the new database with the new user
sudo -u git -H psql -d gitlabhq_production

# Quit the database session
gitlabhq_production> \q
```

2) omnibus 패키지 설치
```sh
$ curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash

$ sudo apt-get install gitlab-ce
```

3) gitlab 환경설정
```sh
$ sudo vi /etc/gitlab/gitlab.rb

.
.
external_url 'http://git.baikal.io'
ci_external_url 'http://ci.baikal.io'

# omnibus 패키지에 포함된 postgreql 을 사용하지 않고 별도 설치한 postgresql 을 사용하도록 설정합니다.
# Disable the built-in Postgres
postgresql['enable'] = false

# Fill in the connection details for database.yml
gitlab_rails['db_adapter'] = "postgresql"
gitlab_rails['db_encoding'] = 'utf8'
gitlab_rails['db_database'] = "gitlabhq_production"
gitlab_rails['db_host'] = '127.0.0.1'
gitlab_rails['db_port'] = '5432'
gitlab_rails['db_username'] = 'git'
gitlab_rails['db_password'] = 'qkfka3000'

# For GitLab CI, you can use the same parameters:
gitlab_ci['db_host'] = '127.0.0.1'

# 디폴트 데이터디렉토리를 사용하지 않고 마운트한 디스크를 사용하도록 변경합니다.
git_data_dir "/mnt/nas/git-data"

# 다음은 smtp 설정입니다.
# 사용하고 있는 smtp 서비스에 맞게 값들을 변경시키도록 합니다.
gitlab_rails['gitlab_email_from'] = 'notification@baikal.io'
gitlab_rails['gitlab_email_reply_to'] = 'notification@baikal.io'

gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "email-smtp.us-east-1.amazonaws.com"
gitlab_rails['smtp_port'] = 587
gitlab_rails['smtp_user_name'] = "AKIAIXXT5IYO3JJJZKDQ"
gitlab_rails['smtp_password'] = "AiAt8UIscXn+1fI8sah2t/wyMDeiBIpKxq0ew4ZQ14tI"
gitlab_rails['smtp_domain'] = "baikal.io"
gitlab_rails['smtp_authentication'] = "login"
gitlab_rails['smtp_enable_starttls_auto'] = true
gitlab_rails['smtp_tls'] = false
gitlab_rails['smtp_openssl_verify_mode'] = 'peer'

# in /etc/gitlab/gitlab.rb
gitlab_ci['gitlab_ci_email_from'] = 'ci@baikal.io'
gitlab_ci['smtp_enable'] = true
gitlab_ci['smtp_address'] = "email-smtp.us-east-1.amazonaws.com"
```

4) 데이터베이스 마이그레이션과 gitlab 재구동

```sh
$ sudo gitlab-ctl reconfigure

$ sudo gitlab-rake gitlab:setup

localhost:80 으로 접속하신 후 초기패스워드 root/ 5iveL!fe 를 입력하셔서 로그인을 확인하도록 합니다.
```

### Runner Server install

러너 서버는 두가지의 프로그램이 설치됩니다.
gitlab-ci-multi-runner : ci build 를 docker 에서 돌릴 수 있는 gitlab officail 프로그램입니다.

gitlab-sonar-multi-runner : sonarqube 코드분석을 docker 에서 돌릴 수 있는 lecle 에서 제작한 프로그램입니다.

##### docker install
1) Docker를 인스톨합니다
```sh
$ sudo apt-get update
$ sudo apt-get install curl
$ curl -sSL https://get.docker.com/ | sh
```

2) Registry 이미지 저장소를 설정합니다.
Docker registry 서버를 이미지 저장소로 지정합니다.

```sh
$ sudo echo 'DOCKER_OPTS="--insecure-registry <registry server host>:5000 "' | sudo tee -a /etc/default/docker

예제:
$ sudo echo 'DOCKER_OPTS="--insecure-registry 172.31.21.144:5000 "' | sudo tee -a /etc/default/docker

.
.

$ sudo service docker restart
```

##### gitlab-ci-multi-runner install

1) apt-get 세팅을 합니다.
```sh
$ curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-ci-multi-runner/script.deb.sh | sudo bash
```

2) gitlab-ci-multi-runner 를 인스톨합니다.
```sh
$ sudo apt-get install gitlab-ci-multi-runner
```

##### gitlab-sonar-multi-runner

1) nodejs 를 인스톨합니다.
```sh
$ curl -sL https://deb.nodesource.com/setup | sudo bash -
$ sudo apt-get install -y nodejs
```

2) node 실행어 변경
gitlab-sonar-multi-runner 는 node 커맨드를 베이스로 돌아가지만,
apt-get 인스톨시 nodejs 커맨드가 node 커맨드로 설정이되어있습니다.
이를 변경하기 위해서 다음을 입력합니다.

```sh
$ sudo ln -s `which nodejs` /usr/bin/node
```

3) forever 설치
```sh
$ sudo npm install forever -g
```

4) gitlab-sonar-multi-runner 설치
```sh
$ sudo git clone http://git.baikal.io/baikal/gitlab-sonar-multi-runner.git

$ cd gitlab-sonar-multi-runner
$ sudo npm install -g
```



