第一部分：先介绍一下git拉去github项目要的基础命令

方法一：使用git clone命令拉取项目
如果项目中之前执行过 git init 命令，即初始化过 git 需要先清理一下
git clone -b master 项目HTTPS地址

方法二：本地初始化过，关联远程拉取
首先需要先初始化本地仓库
git init
然后关联远程仓库
git remote add origin 项目HTTPS地址
最后拉取项目代码
git pull origin master
如果要保持实时更新，确保当前在master分支
git checkout master
拉取远程master分支的最新代码
