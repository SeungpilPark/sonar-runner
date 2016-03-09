#!/bin/bash

export PATH=$PATH:/opt/sonar-runner-2.4/bin

#echo "sonar.host.url: $1"
#echo "sonar.jdbc.username: $2"
#echo "sonar.jdbc.password: $3"
#echo "sonar.jdbc.url: $4"
#echo "sonar.login: $5"
#echo "sonar.password: $6"
#echo "sonar.projectKey: $7"
#echo "sonar.projectName: $8"
#echo "sonar.projectVersion: $9"
#echo "giturl: $10"
#echo "gituser: $11"
#echo "gitpass: $12"

sonarfile=/opt/sonar-runner-2.4/conf/sonar-runner.properties
rm -rf $sonarfile

echo "sonar.host.url=$1" >> $sonarfile
echo "sonar.jdbc.username=$2" >> $sonarfile
echo "sonar.jdbc.password=$3" >> $sonarfile
echo "sonar.jdbc.url=$4" >> $sonarfile
echo "sonar.login=$5" >> $sonarfile
echo "sonar.password=$6" >> $sonarfile

schema=http://
giturl=$10
endpoint=${giturl#$schema}

authurl=$schema''$11':'$12'@'$endpoint

projectdir="${authurl##*/}"
projectdir="${projectdir%.*}"
rm -rf $projectdir
git clone $authurl
cd $projectdir

runnerfile=sonar-project.properties
rm -rf $runnerfile

echo "sonar.projectKey=$7" >> $runnerfile
echo "sonar.projectName=$8" >> $runnerfile
echo "sonar.projectVersion=$9" >> $runnerfile
echo "sonar.sources=." >> $runnerfile
echo "sonar.sourceEncoding=UTF-8" >> $runnerfile

sonar-runner -e
